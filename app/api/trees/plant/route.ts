import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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

    const db = supabaseAdmin()

    const { data: plot } = await db.from('plots').select('owner_wallet, tier').eq('id', plotId).single()
    if (!plot || plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

    const { count } = await db.from('trees').select('id', { count: 'exact' }).eq('plot_id', plotId)
    if ((count ?? 0) >= 3) return NextResponse.json({ error: 'Max 3 trees per plot' }, { status: 400 })

    const tierCfg   = PLOT_TIERS[plot.tier as PlotTier]
    const plantedAt = new Date()
    const readyAt   = new Date(plantedAt.getTime() + treeCfg.growMs / tierCfg.speed)
    const safeSlot  = Math.min(5, Math.max(0, Number(slot) || 0))

    // Try inserting with slot first; if the column doesn't exist yet, insert without it
    let tree: unknown = null
    let insertError: { message: string } | null = null

    const withSlot = await db.from('trees').insert({
      plot_id:    plotId,
      tree_type:  treeType,
      planted_at: plantedAt.toISOString(),
      ready_at:   readyAt.toISOString(),
      slot:       safeSlot,
    }).select().single()

    if (withSlot.error) {
      // Slot column probably missing — retry without it
      const withoutSlot = await db.from('trees').insert({
        plot_id:    plotId,
        tree_type:  treeType,
        planted_at: plantedAt.toISOString(),
        ready_at:   readyAt.toISOString(),
      }).select().single()
      tree        = withoutSlot.data
      insertError = withoutSlot.error
    } else {
      tree = withSlot.data
    }

    if (insertError) return NextResponse.json({ error: (insertError as { message: string }).message }, { status: 500 })

    try { await logEvent('plant_tree', plotId, wallet, { tree_type: treeType }) } catch { /* non-critical */ }

    return NextResponse.json({ tree })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
