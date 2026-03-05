import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { wallet, invite_code } = await req.json()
  if (!wallet || !invite_code?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = supabaseAdmin()

  const { data: tribe } = await db
    .from('tribes')
    .select('id, name, leader_wallet')
    .eq('invite_code', invite_code.trim())
    .maybeSingle()

  if (!tribe) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  if (tribe.leader_wallet === wallet) return NextResponse.json({ error: 'You lead this tribe' }, { status: 400 })

  // Check capacity
  const { count } = await db
    .from('tribe_members')
    .select('*', { count: 'exact', head: true })
    .eq('tribe_id', tribe.id)

  if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Tribe is full (max 10 members)' }, { status: 400 })

  // Already in a tribe?
  const { data: existing } = await db
    .from('tribe_members')
    .select('tribe_id')
    .eq('wallet', wallet)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Leave your current tribe first' }, { status: 400 })

  await db.from('tribe_members').insert({ tribe_id: tribe.id, wallet })

  return NextResponse.json({ ok: true, tribe_name: tribe.name })
}
