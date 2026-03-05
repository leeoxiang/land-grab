/**
 * POST /api/farmers/auto-harvest
 *
 * Body: { plotId: number, wallet: string }
 *
 * Harvests all ready crops + animals on the plot, credits inventory,
 * and stamps last_harvest_at on every farmer assigned to the plot.
 *
 * Called by the client-side FarmersTab on each harvest cycle.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CROPS, ANIMALS } from '@/config/game'
import type { CropType, AnimalType } from '@/config/game'

// Upsert a quantity into the player's inventory
async function addToInventory(
  db: ReturnType<typeof supabaseAdmin>,
  wallet: string,
  itemType: string,
  qty: number,
) {
  const { data: row } = await db
    .from('inventory')
    .select('id, quantity')
    .eq('player_wallet', wallet)
    .eq('item_type', itemType)
    .single()

  if (row) {
    await db.from('inventory').update({ quantity: row.quantity + qty }).eq('id', row.id)
  } else {
    await db.from('inventory').insert({ player_wallet: wallet, item_type: itemType, quantity: qty })
  }
}

export async function POST(req: Request) {
  const { plotId, wallet } = await req.json()
  if (!plotId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db  = supabaseAdmin()
  const now = new Date()

  // Verify plot ownership
  const { data: plot } = await db.from('plots').select('owner_wallet').eq('id', plotId).single()
  if (!plot)                        return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
  if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' },  { status: 403 })

  // Must have at least one farmer
  const { data: farmers } = await db.from('farmers').select('*').eq('plot_id', plotId)
  if (!farmers?.length) return NextResponse.json({ error: 'No farmers on this plot' }, { status: 400 })

  const harvested: { type: string; qty: number }[] = []

  // ── Auto-harvest ready crops ────────────────────────────────────────────────
  const { data: readyCrops } = await db
    .from('crops')
    .select('*')
    .eq('plot_id', plotId)
    .eq('harvested', false)
    .lte('harvest_at', now.toISOString())

  for (const crop of readyCrops ?? []) {
    await db.from('crops').update({ harvested: true }).eq('id', crop.id)
    const cfg = CROPS[crop.crop_type as CropType]
    if (cfg) {
      await addToInventory(db, wallet, crop.crop_type, 1)
      harvested.push({ type: crop.crop_type, qty: 1 })
    }
  }

  // ── Auto-harvest ready animals ──────────────────────────────────────────────
  const { data: readyAnimals } = await db
    .from('animals')
    .select('*')
    .eq('plot_id', plotId)
    .lte('next_harvest', now.toISOString())

  for (const animal of readyAnimals ?? []) {
    const cfg = ANIMALS[animal.animal_type as AnimalType]
    if (!cfg) continue
    const nextHarvest = new Date(now.getTime() + cfg.harvestMs)
    await db.from('animals').update({
      last_harvest: now.toISOString(),
      next_harvest: nextHarvest.toISOString(),
    }).eq('id', animal.id)
    await addToInventory(db, wallet, cfg.produces, cfg.yield)
    harvested.push({ type: cfg.produces, qty: cfg.yield })
  }

  // ── Stamp last_harvest_at on all farmers (best-effort — column may not exist yet) ──
  try {
    await db
      .from('farmers')
      .update({ last_harvest_at: now.toISOString() })
      .eq('plot_id', plotId)
  } catch { /* column not yet migrated — ignore */ }

  return NextResponse.json({
    ok: true,
    harvestedAt: now.toISOString(),
    harvested,
    crops:   readyCrops?.length  ?? 0,
    animals: readyAnimals?.length ?? 0,
  })
}
