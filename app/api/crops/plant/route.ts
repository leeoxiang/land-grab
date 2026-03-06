import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { CROPS, PLOT_TIERS } from '@/config/game'
import type { CropType, PlotTier } from '@/config/game'
import { logEvent } from '@/lib/logEvent'

export async function POST(req: Request) {
  try {
    const { plotId, slot, cropType, wallet } = await req.json()
    if (!plotId || slot === undefined || !cropType || !wallet) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const cropCfg = CROPS[cropType as CropType]
    if (!cropCfg) return NextResponse.json({ error: 'Invalid crop type' }, { status: 400 })

    // Verify ownership
    const { rows: plotRows } = await pool.query(`SELECT owner_wallet, tier FROM plots WHERE id = $1`, [plotId])
    if (!plotRows.length || plotRows[0].owner_wallet !== wallet) {
      return NextResponse.json({ error: 'Not your plot' }, { status: 403 })
    }
    const plot = plotRows[0]

    // Check slot is free
    const { rows: slotRows } = await pool.query(
      `SELECT id FROM crops WHERE plot_id = $1 AND slot = $2 AND harvested = false LIMIT 1`,
      [plotId, slot],
    )
    if (slotRows.length) return NextResponse.json({ error: 'Slot occupied' }, { status: 400 })

    const tierCfg   = PLOT_TIERS[plot.tier as PlotTier]
    const growMs    = cropCfg.growMs / tierCfg.speed
    const plantedAt = new Date()
    const harvestAt = new Date(plantedAt.getTime() + growMs)

    const { rows: inserted } = await pool.query(
      `INSERT INTO crops (plot_id, slot, crop_type, planted_at, harvest_at, harvested)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
      [plotId, slot, cropType, plantedAt.toISOString(), harvestAt.toISOString()],
    )
    const crop = inserted[0]

    try { await logEvent('plant_crop', plotId, wallet, { crop_type: cropType }) } catch { /* ignore */ }

    return NextResponse.json({ crop })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
