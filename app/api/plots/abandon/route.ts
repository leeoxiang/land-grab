import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { plotId, wallet } = await req.json()
  if (!plotId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: plot } = await db.from('plots').select('*').eq('id', plotId).single()
  if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
  if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

  // Clear all crops, animals, farmers on this plot
  await Promise.all([
    db.from('crops').delete().eq('plot_id', plotId),
    db.from('trees').delete().eq('plot_id', plotId),
    db.from('animals').delete().eq('plot_id', plotId),
    db.from('farmers').delete().eq('plot_id', plotId),
  ])

  const { data: updated } = await db
    .from('plots')
    .update({ owner_wallet: null, locked_tokens: 0, claimed_at: null })
    .eq('id', plotId)
    .select()
    .single()

  return NextResponse.json({ plot: updated })
}
