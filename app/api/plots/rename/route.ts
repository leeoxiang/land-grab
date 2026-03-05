import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { plotId, wallet, name } = await req.json()
  if (!plotId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const trimmed = (name ?? '').trim().slice(0, 32)
  const db = supabaseAdmin()

  const { data: plot } = await db.from('plots').select('owner_wallet').eq('id', plotId).single()
  if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
  if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

  const { error } = await db.from('plots').update({ custom_name: trimmed || null }).eq('id', plotId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, name: trimmed || null })
}
