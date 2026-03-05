import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// DELETE /api/tribes/[id]?wallet=... — disband tribe (leader only)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: tribe } = await db
    .from('tribes')
    .select('id, leader_wallet')
    .eq('id', id)
    .maybeSingle()

  if (!tribe) return NextResponse.json({ error: 'Tribe not found' }, { status: 404 })
  if (tribe.leader_wallet !== wallet) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  await db.from('tribes').delete().eq('id', id)

  return NextResponse.json({ ok: true })
}
