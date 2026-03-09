import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { FARMERS } from '@/config/game'
import type { FarmerType } from '@/config/game'
import { logEvent } from '@/lib/logEvent'

export async function POST(req: Request) {
  try {
    const { plotId, farmerType, wallet } = await req.json()
    if (!plotId || !farmerType || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const farmerCfg = FARMERS[farmerType as FarmerType]
    if (!farmerCfg) return NextResponse.json({ error: 'Invalid farmer type' }, { status: 400 })

    const db = supabaseAdmin()

    const { data: plot } = await db.from('plots').select('owner_wallet').eq('id', plotId).single()
    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

    // Only 1 farmer per type per plot
    const { data: existing } = await db.from('farmers')
      .select('id').eq('plot_id', plotId).eq('farmer_type', farmerType).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already hired this farmer type' }, { status: 400 })

    const { data: farmer, error } = await db.from('farmers').insert({
      plot_id:      plotId,
      farmer_type:  farmerType,
      purchased_at: new Date().toISOString(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update farmer_count on the plot so WorldScene can render the NPC sprite
    const { count: farmerCount } = await db
      .from('farmers').select('*', { count: 'exact', head: true }).eq('plot_id', plotId)

    try {
      await db.from('plots').update({ farmer_count: farmerCount ?? 1 }).eq('id', plotId)
    } catch { /* farmer_count column may not exist yet */ }

    try { await logEvent('hire_farmer', plotId, wallet, { farmer_type: farmerType }) } catch { /* non-critical */ }

    return NextResponse.json({ farmer, farmerCount: farmerCount ?? 1 })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
