import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { FARMERS } from '@/config/game'
import type { FarmerType } from '@/config/game'

export async function POST(req: Request) {
  const { plotId, farmerType, wallet } = await req.json()
  if (!plotId || !farmerType || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const farmerCfg = FARMERS[farmerType as FarmerType]
  if (!farmerCfg) return NextResponse.json({ error: 'Invalid farmer type' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: plot } = await db.from('plots').select('*').eq('id', plotId).single()
  if (!plot || plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

  // Only 1 farmer per type per plot
  const { data: existing } = await db.from('farmers')
    .select('id').eq('plot_id', plotId).eq('farmer_type', farmerType).single()
  if (existing) return NextResponse.json({ error: 'Already hired this farmer type' }, { status: 400 })

  const { data: farmer, error } = await db.from('farmers').insert({
    plot_id:      plotId,
    farmer_type:  farmerType,
    purchased_at: new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ farmer })
}
