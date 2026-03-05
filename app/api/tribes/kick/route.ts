import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { wallet, target_wallet } = await req.json()
  if (!wallet || !target_wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: tribe } = await db
    .from('tribes')
    .select('id')
    .eq('leader_wallet', wallet)
    .maybeSingle()

  if (!tribe) return NextResponse.json({ error: 'Not a tribe leader' }, { status: 403 })

  await db.from('tribe_members').delete().eq('tribe_id', tribe.id).eq('wallet', target_wallet)

  return NextResponse.json({ ok: true })
}
