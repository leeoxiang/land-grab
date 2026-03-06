import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { ANIMALS, PLOT_TIERS } from '@/config/game'
import type { AnimalType, PlotTier } from '@/config/game'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'

export async function POST(req: Request) {
  try {
    const { plotId, animalType, wallet } = await req.json()
    if (!plotId || !animalType || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const animalCfg = ANIMALS[animalType as AnimalType]
    if (!animalCfg) return NextResponse.json({ error: 'Invalid animal type' }, { status: 400 })

    // Verify ownership
    const { rows: plotRows } = await pool.query(`SELECT owner_wallet, tier FROM plots WHERE id = $1`, [plotId])
    if (!plotRows.length || plotRows[0].owner_wallet !== wallet) {
      return NextResponse.json({ error: 'Not your plot' }, { status: 403 })
    }
    const plot = plotRows[0]

    // Check slot limit
    const tierCfg = PLOT_TIERS[plot.tier as PlotTier]
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM animals WHERE plot_id = $1`, [plotId],
    )
    const count = Number(countRows[0]?.cnt ?? 0)
    if (count >= tierCfg.animalSlots) return NextResponse.json({ error: 'Animal slots full' }, { status: 400 })

    const now         = new Date()
    const nextHarvest = new Date(now.getTime() + animalCfg.harvestMs)

    const { rows: inserted } = await pool.query(
      `INSERT INTO animals (plot_id, animal_type, purchased_at, last_harvest, next_harvest)
       VALUES ($1, $2, $3, NULL, $4) RETURNING *`,
      [plotId, animalType, now.toISOString(), nextHarvest.toISOString()],
    )
    const animal = inserted[0]

    // Non-critical side effects
    try { await logEvent('buy_animal', plotId, wallet, { animal_type: animalType }) } catch { /* ignore */ }
    let newAchievements: string[] = []
    try {
      newAchievements = await checkAchievements(wallet, { action: 'buy_animal', animalCount: count + 1 })
    } catch { /* ignore */ }

    return NextResponse.json({ animal, newAchievements })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
