import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TREES, PLOT_TIERS } from '@/config/game'
import type { TreeType, PlotTier } from '@/config/game'

export async function POST(req: Request) {
  const { plotId, treeType, wallet } = await req.json()
  if (!plotId || !treeType || !wallet) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const treeCfg = TREES[treeType as TreeType]
  if (!treeCfg) return NextResponse.json({ error: 'Invalid tree type' }, { status: 400 })

  const db = supabaseAdmin()

  // Verify ownership
  const { data: plot } = await db.from('plots').select('*').eq('id', plotId).single()
  if (!plot || plot.owner_wallet !== wallet) {
    return NextResponse.json({ error: 'Not your plot' }, { status: 403 })
  }

  // Check tree limit (max 3 trees per plot)
  const { count } = await db.from('trees').select('id', { count: 'exact' }).eq('plot_id', plotId)
  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Max 3 trees per plot' }, { status: 400 })
  }

  const tierCfg   = PLOT_TIERS[plot.tier as PlotTier]
  const plantedAt = new Date()
  const readyAt   = new Date(plantedAt.getTime() + treeCfg.growMs / tierCfg.speed)

  const { data: tree, error } = await db.from('trees').insert({
    plot_id:    plotId,
    tree_type:  treeType,
    planted_at: plantedAt.toISOString(),
    ready_at:   readyAt.toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tree })
}
