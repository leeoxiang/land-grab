import { NextResponse } from 'next/server'
import { pool } from '@/lib/db'
import { TREES } from '@/config/game'
import type { TreeType } from '@/config/game'
import { logEvent } from '@/lib/logEvent'

export async function POST(req: Request) {
  try {
    const { treeId, wallet } = await req.json()
    if (!treeId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    // Load tree + plot ownership
    const { rows } = await pool.query(
      `SELECT t.id, t.tree_type, t.plot_id, t.ready_at, t.next_harvest, t.last_harvest,
              p.owner_wallet
       FROM trees t
       JOIN plots p ON p.id = t.plot_id
       WHERE t.id = $1::uuid`,
      [treeId],
    )
    if (!rows.length) return NextResponse.json({ error: 'Tree not found' }, { status: 404 })
    const tree = rows[0]

    if (tree.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your tree' }, { status: 403 })

    const now = new Date()
    if (new Date(tree.ready_at) > now) return NextResponse.json({ error: 'Tree not ready yet' }, { status: 400 })
    if (tree.next_harvest && new Date(tree.next_harvest) > now) {
      return NextResponse.json({ error: 'Harvest cooldown active' }, { status: 400 })
    }

    const treeCfg     = TREES[tree.tree_type as TreeType]
    const nextHarvest = new Date(now.getTime() + treeCfg.harvestMs)

    await pool.query(
      `UPDATE trees SET last_harvest = $1, next_harvest = $2 WHERE id = $3`,
      [now.toISOString(), nextHarvest.toISOString(), treeId],
    )

    const itemType = `${tree.tree_type}_fruit`
    const { rows: inv } = await pool.query(
      `SELECT id, quantity FROM inventory WHERE player_wallet = $1 AND item_type = $2 LIMIT 1`,
      [wallet, itemType],
    )
    if (inv.length > 0) {
      await pool.query(`UPDATE inventory SET quantity = quantity + $1 WHERE id = $2`, [treeCfg.yield, inv[0].id])
    } else {
      await pool.query(
        `INSERT INTO inventory (player_wallet, item_type, quantity) VALUES ($1, $2, $3)`,
        [wallet, itemType, treeCfg.yield],
      )
    }

    try { await logEvent('harvest_tree', tree.plot_id, wallet, { tree_type: tree.tree_type, amount: treeCfg.yield }) } catch { /* ignore */ }

    return NextResponse.json({
      harvested:      itemType,
      yield:          treeCfg.yield,
      nextHarvestAt:  nextHarvest.toISOString(),
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
