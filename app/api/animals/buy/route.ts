import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ANIMALS, PLOT_TIERS } from '@/config/game'
import type { AnimalType, PlotTier } from '@/config/game'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'
import { verifyUsdcTx } from '@/lib/verifyTx'

// GET /api/animals/buy?plotId=&animalType=&wallet= — preflight validation (no write)
// Returns { ok, cost, usedSlots } so the client can show the slot picker.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const plotId     = Number(searchParams.get('plotId'))
  const animalType = searchParams.get('animalType') ?? ''
  const wallet     = searchParams.get('wallet') ?? ''

  if (!plotId || !animalType || !wallet)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const animalCfg = ANIMALS[animalType as AnimalType]
  if (!animalCfg) return NextResponse.json({ error: 'Invalid animal type' }, { status: 400 })

  const db = supabaseAdmin()
  const { data: plot } = await db.from('plots').select('owner_wallet, tier').eq('id', plotId).single()
  if (!plot || plot.owner_wallet !== wallet)
    return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

  const tierCfg = PLOT_TIERS[plot.tier as PlotTier]
  const { data: existingAnimals, count } = await db
    .from('animals').select('slot', { count: 'exact' }).eq('plot_id', plotId)
  if ((count ?? 0) >= tierCfg.animalSlots)
    return NextResponse.json({ error: 'Animal slots full' }, { status: 400 })

  const usedSlots = (existingAnimals ?? []).map((a: { slot: number }) => a.slot)
  return NextResponse.json({ ok: true, cost: animalCfg.cost, usedSlots })
}

export async function POST(req: Request) {
  try {
    const { plotId, animalType, wallet, txSignature, slot } = await req.json()
    if (!plotId || !animalType || !wallet || slot === undefined)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const animalCfg = ANIMALS[animalType as AnimalType]
    if (!animalCfg) return NextResponse.json({ error: 'Invalid animal type' }, { status: 400 })

    // Verify on-chain payment before inserting (bypass allowed in dev via DEV_BYPASS_BALANCE)
    if (txSignature) {
      try {
        await verifyUsdcTx(txSignature, wallet, animalCfg.cost)
      } catch (verifyErr: unknown) {
        return NextResponse.json({ error: `Payment verification failed: ${String(verifyErr)}` }, { status: 402 })
      }
    } else if (process.env.DEV_BYPASS_BALANCE !== 'true') {
      return NextResponse.json({ error: 'Transaction signature required' }, { status: 402 })
    }

    const db = supabaseAdmin()

    const { data: plot } = await db.from('plots').select('owner_wallet, tier').eq('id', plotId).single()
    if (!plot || plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

    const tierCfg = PLOT_TIERS[plot.tier as PlotTier]
    const { count } = await db.from('animals').select('*', { count: 'exact', head: true }).eq('plot_id', plotId)
    if ((count ?? 0) >= tierCfg.animalSlots) return NextResponse.json({ error: 'Animal slots full' }, { status: 400 })

    // Check the chosen slot is free (unique constraint also guards this at DB level)
    const { data: slotOccupied } = await db.from('animals')
      .select('id').eq('plot_id', plotId).eq('slot', slot).maybeSingle()
    if (slotOccupied) return NextResponse.json({ error: 'That slot is already occupied' }, { status: 400 })

    const now         = new Date()
    const nextHarvest = new Date(now.getTime() + animalCfg.harvestMs)

    const { data: animal, error } = await db.from('animals').insert({
      plot_id:      plotId,
      animal_type:  animalType,
      slot,
      purchased_at: now.toISOString(),
      last_harvest: null,
      next_harvest: nextHarvest.toISOString(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try { await logEvent('buy_animal', plotId, wallet, { animal_type: animalType, slot }) } catch { /* non-critical */ }
    let newAchievements: string[] = []
    try {
      newAchievements = await checkAchievements(wallet, { action: 'buy_animal', animalCount: (count ?? 0) + 1 })
    } catch { /* non-critical */ }

    return NextResponse.json({ animal, newAchievements })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
