import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { TREES, PLOT_TIERS } from '@/config/game'
import type { TreeType, PlotTier } from '@/config/game'
import { logEvent } from '@/lib/logEvent'

export async function POST(req: Request) {
  try {
    const { plotId, treeType, wallet, slot = 0 } = await req.json()
    if (!plotId || !treeType || !wallet) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const treeCfg = TREES[treeType as TreeType]
    if (!treeCfg) return NextResponse.json({ error: 'Invalid tree type' }, { status: 400 })

    // Verify ownership
    const { rows: plotRows } = await pool.query(`SELECT owner_wallet, tier FROM plots WHERE id = $1`, [plotId])
    if (!plotRows.length || plotRows[0].owner_wallet !== wallet) {
      return NextResponse.json({ error: 'Not your plot' }, { status: 403 })
    }
    const plot = plotRows[0]

    // Check tree limit (max 3 per plot)
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM trees WHERE plot_id = $1`, [plotId],
    )
    if (Number(countRows[0]?.cnt ?? 0) >= 3) {
      return NextResponse.json({ error: 'Max 3 trees per plot' }, { status: 400 })
    }

    const tierCfg   = PLOT_TIERS[plot.tier as PlotTier]
    const plantedAt = new Date()
    const readyAt   = new Date(plantedAt.getTime() + treeCfg.growMs / tierCfg.speed)
    const safeSlot  = Math.min(5, Math.max(0, Number(slot) || 0))

    const { rows: inserted } = await pool.query(
      `INSERT INTO trees (plot_id, tree_type, planted_at, ready_at, slot)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [plotId, treeType, plantedAt.toISOString(), readyAt.toISOString(), safeSlot],
    )
    const tree = inserted[0]

    try { await logEvent('plant_tree', plotId, wallet, { tree_type: treeType }) } catch { /* ignore */ }

    return NextResponse.json({ tree })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
