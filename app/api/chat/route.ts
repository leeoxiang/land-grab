import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()
  const { data } = await db
    .from('chat_messages')
    .select('id, wallet, message, created_at')
    .order('created_at', { ascending: false })
    .limit(60)
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const { wallet, message } = await req.json()
  if (!wallet || !message?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const text = String(message).trim().slice(0, 120)
  if (text.length < 1) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const db = supabaseAdmin()

  // Rate-limit: max 1 message per 3 seconds per wallet
  const since = new Date(Date.now() - 3000).toISOString()
  const { count } = await db
    .from('chat_messages')
    .select('*', { count: 'exact', head: true })
    .eq('wallet', wallet)
    .gte('created_at', since)
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'Slow down' }, { status: 429 })
  }

  const { data, error } = await db
    .from('chat_messages')
    .insert({ wallet, message: text })
    .select('id, wallet, message, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
