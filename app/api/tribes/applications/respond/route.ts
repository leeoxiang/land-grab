import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/tribes/applications/respond — accept or decline an application
export async function POST(req: Request) {
  const { wallet, application_id, action } = await req.json()
  if (!wallet || !application_id || !['accept', 'decline'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Get application
  const { data: app } = await db
    .from('tribe_applications')
    .select('id, tribe_id, wallet, status')
    .eq('id', application_id)
    .maybeSingle()

  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  if (app.status !== 'pending') return NextResponse.json({ error: 'Application already resolved' }, { status: 400 })

  // Verify leader
  const { data: tribe } = await db
    .from('tribes')
    .select('id, leader_wallet, tribe_members(wallet)')
    .eq('id', app.tribe_id)
    .maybeSingle()

  if (!tribe || tribe.leader_wallet !== wallet) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (action === 'decline') {
    await db.from('tribe_applications').update({ status: 'declined' }).eq('id', application_id)
    return NextResponse.json({ ok: true, action: 'declined' })
  }

  // ACCEPT
  // Check tribe not full
  if ((tribe.tribe_members as { wallet: string }[]).length >= 10) {
    return NextResponse.json({ error: 'Tribe is full' }, { status: 400 })
  }

  // Check applicant not already in a tribe
  const { data: existingMembership } = await db
    .from('tribe_members').select('tribe_id').eq('wallet', app.wallet).maybeSingle()
  if (existingMembership) {
    await db.from('tribe_applications').update({ status: 'declined' }).eq('id', application_id)
    return NextResponse.json({ error: 'Applicant is already in a tribe' }, { status: 400 })
  }

  // Add to tribe
  await db.from('tribe_members').insert({ tribe_id: app.tribe_id, wallet: app.wallet })
  // Mark accepted + decline any other pending applications from this wallet
  await db.from('tribe_applications').update({ status: 'accepted' }).eq('id', application_id)
  await db
    .from('tribe_applications')
    .update({ status: 'declined' })
    .eq('wallet', app.wallet)
    .eq('status', 'pending')
    .neq('id', application_id)

  return NextResponse.json({ ok: true, action: 'accepted' })
}
