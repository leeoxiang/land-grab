import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TREES } from '@/config/game'
import type { TreeType } from '@/config/game'
import { logEvent } from '@/lib/logEvent'

export async function POST(req: Request) {
  try {
    const { treeId, wallet } = await req.json()
    if (!treeId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const db = supabaseAdmin()

    const { data: tree, error: tErr } = await db
      .from('trees')
      .select('*, plots!inner(owner_wallet)')
      .eq('id', treeId)
      .single()

    if (tErr || !tree) return NextResponse.json({ error: tErr?.message ?? 'Tree not found' }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((tree as any).plots?.owner_wallet !== wallet) {
      return NextResponse.json({ error: 'Not your tree' }, { status: 403 })
    }

    const now = new Date()
    if (new Date(tree.ready_at) > now) return NextResponse.json({ error: 'Tree not ready yet' }, { status: 400 })
    if (tree.next_harvest && new Date(tree.next_harvest) > now) {
      return NextResponse.json({ error: 'Harvest cooldown active' }, { status: 400 })
    }

    const treeCfg     = TREES[tree.tree_type as TreeType]
    const nextHarvest = new Date(now.getTime() + treeCfg.harvestMs)

    await db.from('trees').update({
      last_harvest: now.toISOString(),
      next_harvest: nextHarvest.toISOString(),
    }).eq('id', treeId)

    const itemType = `${tree.tree_type}_fruit`
    const { data: existing } = await db.from('inventory')
      .select('id, quantity').eq('player_wallet', wallet).eq('item_type', itemType).single()

    if (existing) {
      await db.from('inventory').update({ quantity: existing.quantity + treeCfg.yield }).eq('id', existing.id)
    } else {
      await db.from('inventory').insert({ player_wallet: wallet, item_type: itemType, quantity: treeCfg.yield })
    }

    try { await logEvent('harvest_tree', tree.plot_id, wallet, { tree_type: tree.tree_type, amount: treeCfg.yield }) } catch { /* non-critical */ }

    return NextResponse.json({ harvested: itemType, yield: treeCfg.yield, nextHarvestAt: nextHarvest.toISOString() })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
