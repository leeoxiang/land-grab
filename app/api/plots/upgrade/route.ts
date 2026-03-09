import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { UPGRADES, MAX_UPGRADE_LEVEL } from '@/config/game'

export async function POST(req: Request) {
  try {
    const { plotId, wallet } = await req.json()
    if (!plotId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Fetch ownership + current upgrade level (column may not exist yet)
    const { rows: plotRows } = await pool.query(
      `SELECT owner_wallet FROM plots WHERE id = $1`, [plotId],
    )
    if (!plotRows.length) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    if (plotRows[0].owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

    // upgrade_level may not exist if schema_additions.sql hasn't been run — default to 1
    let currentLevel = 1
    try {
      const { rows: ul } = await pool.query(`SELECT upgrade_level FROM plots WHERE id = $1`, [plotId])
      currentLevel = Number(ul[0]?.upgrade_level ?? 1)
    } catch { /* column not yet in DB */ }

    if (currentLevel >= MAX_UPGRADE_LEVEL) {
      return NextResponse.json({ error: 'Already at max level' }, { status: 400 })
    }

    const nextLevel  = currentLevel + 1
    const upgradeCfg = UPGRADES[nextLevel]

    try {
      await pool.query(`UPDATE plots SET upgrade_level = $1 WHERE id = $2`, [nextLevel, plotId])
    } catch {
      // Column doesn't exist yet — return success anyway so the UI doesn't break
      return NextResponse.json({ ok: true, upgrade_level: nextLevel, multiplier: upgradeCfg.multiplier, warning: 'upgrade_level column missing, run schema_additions.sql' })
    }

    return NextResponse.json({ ok: true, upgrade_level: nextLevel, multiplier: upgradeCfg.multiplier })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
