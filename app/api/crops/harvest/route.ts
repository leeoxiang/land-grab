import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { CROPS, GOLDEN_HOUR_INTERVAL_MS, GOLDEN_HOUR_DURATION_MS, GOLDEN_HOUR_YIELD_BONUS } from '@/config/game'
import type { CropType } from '@/config/game'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'

function isGoldenHour() {
  return (Date.now() % GOLDEN_HOUR_INTERVAL_MS) < GOLDEN_HOUR_DURATION_MS
}

export async function POST(req: Request) {
  try {
    const { cropId, wallet } = await req.json()
    if (!cropId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Load crop + plot (no upgrade_level — may not exist if schema_additions.sql not run)
    const { rows } = await pool.query(
      `SELECT c.id, c.crop_type, c.harvest_at, c.harvested, c.plot_id,
              p.owner_wallet, p.tier
       FROM crops c
       JOIN plots p ON p.id = c.plot_id
       WHERE c.id = $1::uuid`,
      [cropId],
    )
    if (!rows.length) return NextResponse.json({ error: 'Crop not found' }, { status: 404 })
    const crop = rows[0]

    if (crop.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your crop' }, { status: 403 })
    if (crop.harvested)               return NextResponse.json({ error: 'Already harvested' }, { status: 400 })

    const now = new Date()
    if (new Date(crop.harvest_at) > now) return NextResponse.json({ error: 'Not ready yet' }, { status: 400 })

    const cropCfg = CROPS[crop.crop_type as CropType]

    // upgrade_level may not exist yet — safe fallback to 1
    let upgradeLevel = 1
    try {
      const { rows: ul } = await pool.query(`SELECT upgrade_level FROM plots WHERE id = $1`, [crop.plot_id])
      upgradeLevel = Number(ul[0]?.upgrade_level ?? 1)
    } catch { /* column not yet in DB */ }

    const baseMultiplier = upgradeLevel >= 4 ? 2.0 : upgradeLevel === 3 ? 1.5 : upgradeLevel === 2 ? 1.25 : 1.0
    const goldenMult     = isGoldenHour() ? 1 + GOLDEN_HOUR_YIELD_BONUS : 1.0

    // Tribe bonus
    let tribeBonus = 1.0
    try {
      const { rows: memberRows } = await pool.query(
        `SELECT tribe_id FROM tribe_members WHERE wallet = $1 LIMIT 1`, [wallet],
      )
      if (memberRows.length) {
        tribeBonus = 1.1
      } else {
        const { rows: leaderRows } = await pool.query(
          `SELECT COUNT(tm.wallet) AS cnt FROM tribes t
           LEFT JOIN tribe_members tm ON tm.tribe_id = t.id
           WHERE t.leader_wallet = $1
           GROUP BY t.id LIMIT 1`,
          [wallet],
        )
        if (leaderRows.length) tribeBonus = 1 + Number(leaderRows[0].cnt) * 0.05
      }
    } catch { /* tribe lookup non-critical */ }

    const multiplier = baseMultiplier * goldenMult * tribeBonus
    const quantity   = Math.max(1, Math.ceil(multiplier))

    // Mark harvested + upsert inventory
    await pool.query(`UPDATE crops SET harvested = true WHERE id = $1`, [cropId])

    const { rows: inv } = await pool.query(
      `SELECT id, quantity FROM inventory WHERE player_wallet = $1 AND item_type = $2 LIMIT 1`,
      [wallet, crop.crop_type],
    )
    if (inv.length > 0) {
      await pool.query(`UPDATE inventory SET quantity = quantity + $1 WHERE id = $2`, [quantity, inv[0].id])
    } else {
      await pool.query(
        `INSERT INTO inventory (player_wallet, item_type, quantity) VALUES ($1, $2, $3)`,
        [wallet, crop.crop_type, quantity],
      )
    }

    // Non-critical side effects
    try { await logEvent('harvest_crop', crop.plot_id, wallet, { crop_type: crop.crop_type, quantity }) } catch { /* ignore */ }
    let newAchievements: string[] = []
    try {
      newAchievements = await checkAchievements(wallet, { action: 'harvest_crop', plotTier: crop.tier })
    } catch { /* ignore */ }

    return NextResponse.json({
      harvested:       true,
      item:            crop.crop_type,
      sellPrice:       cropCfg.sellPrice,
      quantity,
      goldenHour:      isGoldenHour(),
      newAchievements,
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
