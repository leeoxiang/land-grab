import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { wallet } = await req.json()
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()
  await db.from('tribe_members').delete().eq('wallet', wallet)

  return NextResponse.json({ ok: true })
}
