import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { ANIMALS, GOLDEN_HOUR_INTERVAL_MS, GOLDEN_HOUR_DURATION_MS, GOLDEN_HOUR_YIELD_BONUS } from '@/config/game'
import type { AnimalType } from '@/config/game'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'

function isGoldenHour() {
  return (Date.now() % GOLDEN_HOUR_INTERVAL_MS) < GOLDEN_HOUR_DURATION_MS
}

export async function POST(req: Request) {
  try {
    const { animalId, wallet } = await req.json()
    if (!animalId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Load animal + plot ownership (no upgrade_level — may not exist if schema_additions.sql not run)
    const { rows } = await pool.query(
      `SELECT a.id, a.animal_type, a.plot_id, a.next_harvest, a.last_harvest,
              p.owner_wallet, p.tier
       FROM animals a
       JOIN plots p ON p.id = a.plot_id
       WHERE a.id = $1::uuid`,
      [animalId],
    )
    if (!rows.length) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })
    const animal = rows[0]

    if (animal.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your animal' }, { status: 403 })

    const now = new Date()
    if (animal.next_harvest && new Date(animal.next_harvest) > now) {
      return NextResponse.json({ error: 'Not ready yet' }, { status: 400 })
    }

    const animalCfg   = ANIMALS[animal.animal_type as AnimalType]
    const nextHarvest = new Date(now.getTime() + animalCfg.harvestMs)

    // upgrade_level may not exist yet — safe fallback to 1
    let upgradeLevel = 1
    try {
      const { rows: ul } = await pool.query(`SELECT upgrade_level FROM plots WHERE id = $1`, [animal.plot_id])
      upgradeLevel = Number(ul[0]?.upgrade_level ?? 1)
    } catch { /* column not yet in DB */ }

    const baseMultiplier = upgradeLevel >= 4 ? 2.0 : upgradeLevel === 3 ? 1.5 : upgradeLevel === 2 ? 1.25 : 1.0
    const multiplier     = isGoldenHour() ? baseMultiplier * (1 + GOLDEN_HOUR_YIELD_BONUS) : baseMultiplier
    const amount         = Math.max(1, Math.round(animalCfg.yield * multiplier))

    // Update animal timestamps
    await pool.query(
      `UPDATE animals SET last_harvest = $1, next_harvest = $2 WHERE id = $3`,
      [now.toISOString(), nextHarvest.toISOString(), animalId],
    )

    // Upsert inventory
    const { rows: inv } = await pool.query(
      `SELECT id, quantity FROM inventory WHERE player_wallet = $1 AND item_type = $2 LIMIT 1`,
      [wallet, animalCfg.produces],
    )
    if (inv.length > 0) {
      await pool.query(`UPDATE inventory SET quantity = quantity + $1 WHERE id = $2`, [amount, inv[0].id])
    } else {
      await pool.query(
        `INSERT INTO inventory (player_wallet, item_type, quantity) VALUES ($1, $2, $3)`,
        [wallet, animalCfg.produces, amount],
      )
    }

    // Count animals for achievement (non-blocking)
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM animals WHERE plot_id = $1`,
      [animal.plot_id],
    )
    const animalCount = Number(countRows[0]?.cnt ?? 0)

    // Non-critical side effects
    try { await logEvent('harvest_animal', animal.plot_id, wallet, { animal_type: animal.animal_type, amount }) } catch { /* ignore */ }
    let newAchievements: string[] = []
    try {
      newAchievements = await checkAchievements(wallet, { action: 'harvest_animal', animalCount, plotTier: animal.tier })
    } catch { /* ignore */ }

    return NextResponse.json({ harvested: true, item: animalCfg.produces, amount, goldenHour: isGoldenHour(), newAchievements })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
