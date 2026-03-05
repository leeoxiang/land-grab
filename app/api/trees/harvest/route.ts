import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TREES } from '@/config/game'
import type { TreeType } from '@/config/game'
import { ensurePlayer } from '@/lib/ensurePlayer'

export async function POST(req: Request) {
  const { treeId, wallet } = await req.json()
  if (!treeId || !wallet) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  await ensurePlayer(wallet)
  const db = supabaseAdmin()

  // Load tree + verify ownership through plot
  const { data: tree } = await db.from('trees')
    .select('*, plots!inner(owner_wallet)')
    .eq('id', treeId)
    .single()

  if (!tree) return NextResponse.json({ error: 'Tree not found' }, { status: 404 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((tree as any).plots?.owner_wallet !== wallet) {
    return NextResponse.json({ error: 'Not your tree' }, { status: 403 })
  }

  const now = new Date()

  // Must be fully grown
  if (new Date(tree.ready_at) > now) {
    return NextResponse.json({ error: 'Tree not ready yet' }, { status: 400 })
  }

  // Must not be on harvest cooldown
  if (tree.next_harvest && new Date(tree.next_harvest) > now) {
    return NextResponse.json({ error: 'Harvest cooldown active' }, { status: 400 })
  }

  const treeCfg    = TREES[tree.tree_type as TreeType]
  const nextHarvest = new Date(now.getTime() + treeCfg.harvestMs)

  // Update tree harvest timestamps
  await db.from('trees').update({
    last_harvest: now.toISOString(),
    next_harvest: nextHarvest.toISOString(),
  }).eq('id', treeId)

  // Add yield to inventory
  const itemType = `${tree.tree_type}_fruit`
  const { data: existing } = await db.from('inventory')
    .select('*').eq('player_wallet', wallet).eq('item_type', itemType).single()

  if (existing) {
    await db.from('inventory').update({ quantity: existing.quantity + treeCfg.yield }).eq('id', existing.id)
  } else {
    await db.from('inventory').insert({ player_wallet: wallet, item_type: itemType, quantity: treeCfg.yield })
  }

  return NextResponse.json({
    harvested:    itemType,
    yield:        treeCfg.yield,
    sellPrice:    treeCfg.yield,
    nextHarvestAt: nextHarvest.toISOString(),
  })
}
