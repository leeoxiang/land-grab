import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/tribes/apply — submit an application to join a tribe
export async function POST(req: Request) {
  const { wallet, tribe_id, message } = await req.json()
  if (!wallet || !tribe_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  // Already in a tribe?
  const { data: membership } = await db
    .from('tribe_members').select('tribe_id').eq('wallet', wallet).maybeSingle()
  if (membership) return NextResponse.json({ error: 'Leave your current tribe first' }, { status: 400 })

  // Already leads a tribe?
  const { data: leadership } = await db
    .from('tribes').select('id').eq('leader_wallet', wallet).maybeSingle()
  if (leadership) return NextResponse.json({ error: 'Disband your tribe first' }, { status: 400 })

  // Tribe exists and has space?
  const { data: tribe } = await db
    .from('tribes')
    .select('id, name, leader_wallet, tribe_members(wallet)')
    .eq('id', tribe_id)
    .maybeSingle()
  if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })
  if (tribe.leader_wallet === wallet) return NextResponse.json({ error: 'You lead this tribe' }, { status: 400 })
  if ((tribe.tribe_members as { wallet: string }[]).length >= 10) {
    return NextResponse.json({ error: 'Tribe is full' }, { status: 400 })
  }

  // Already applied (pending)?
  const { data: existing } = await db
    .from('tribe_applications')
    .select('id, status')
    .eq('tribe_id', tribe_id)
    .eq('wallet', wallet)
    .maybeSingle()

  if (existing?.status === 'pending') return NextResponse.json({ error: 'Application already pending' }, { status: 400 })

  // Upsert (re-apply after decline)
  const { error } = await db
    .from('tribe_applications')
    .upsert(
      { tribe_id, wallet, message: message?.trim().slice(0, 120) ?? null, status: 'pending' },
      { onConflict: 'tribe_id,wallet' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true, tribe_name: tribe.name })
}
