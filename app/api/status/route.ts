import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/status?wallet=xxx
export async function GET(req: Request) {
  const url    = new URL(req.url)
  const wallet = url.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()
  const { data } = await db.from('player_status').select('status_text').eq('wallet', wallet).single()
  return NextResponse.json({ status_text: data?.status_text ?? '' })
}

// POST /api/status  { wallet, statusText }
export async function POST(req: Request) {
  const { wallet, statusText } = await req.json()
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const text = (statusText ?? '').trim().slice(0, 24)

  const db = supabaseAdmin()
  await db.from('player_status').upsert(
    { wallet, status_text: text, updated_at: new Date().toISOString() },
    { onConflict: 'wallet' },
  )

  return NextResponse.json({ ok: true, status_text: text })
}
