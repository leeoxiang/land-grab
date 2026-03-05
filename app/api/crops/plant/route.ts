import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CROPS, PLOT_TIERS } from '@/config/game'
import type { CropType, PlotTier } from '@/config/game'
import { logEvent } from '@/lib/logEvent'

export async function POST(req: Request) {
  const { plotId, slot, cropType, wallet } = await req.json()
  if (!plotId || slot === undefined || !cropType || !wallet) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const cropCfg = CROPS[cropType as CropType]
  if (!cropCfg) return NextResponse.json({ error: 'Invalid crop type' }, { status: 400 })

  const db = supabaseAdmin()

  // Verify ownership
  const { data: plot } = await db.from('plots').select('*').eq('id', plotId).single()
  if (!plot || plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

  // Check slot is free
  const { data: existing } = await db.from('crops')
    .select('id').eq('plot_id', plotId).eq('slot', slot).eq('harvested', false).single()
  if (existing) return NextResponse.json({ error: 'Slot occupied' }, { status: 400 })

  // Apply plot tier speed multiplier
  const tierCfg = PLOT_TIERS[plot.tier as PlotTier]
  const growMs = cropCfg.growMs / tierCfg.speed

  const plantedAt  = new Date()
  const harvestAt  = new Date(plantedAt.getTime() + growMs)

  // Deduct seed cost from player inventory / balance (simplified: tracked in DB)
  // Full on-chain token deduction can be wired in later

  const { data: crop, error } = await db.from('crops').insert({
    plot_id:    plotId,
    slot,
    crop_type:  cropType,
    planted_at: plantedAt.toISOString(),
    harvest_at: harvestAt.toISOString(),
    harvested:  false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logEvent('plant_crop', plotId, wallet, { crop_type: cropType })

  return NextResponse.json({ crop })
}
