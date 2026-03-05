import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/alliances/leave  { wallet }
export async function POST(req: Request) {
  const { wallet } = await req.json()
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: membership } = await db
    .from('alliance_members')
    .select('alliance_id, alliances(leader_wallet)')
    .eq('wallet', wallet)
    .single()

  if (!membership) return NextResponse.json({ error: 'Not in an alliance' }, { status: 400 })

  // If leader is leaving and there are other members, block (must transfer leadership first)
  const alliance = membership.alliances as unknown as { leader_wallet: string } | null
  if (alliance?.leader_wallet === wallet) {
    const { count } = await db
      .from('alliance_members')
      .select('*', { count: 'exact', head: true })
      .eq('alliance_id', membership.alliance_id)
    if ((count ?? 0) > 1) {
      return NextResponse.json({ error: 'Transfer leadership before leaving' }, { status: 400 })
    }
    // Solo leader — dissolve the alliance
    await db.from('alliances').delete().eq('id', membership.alliance_id)
    return NextResponse.json({ ok: true, dissolved: true })
  }

  await db.from('alliance_members').delete().eq('wallet', wallet).eq('alliance_id', membership.alliance_id)
  return NextResponse.json({ ok: true })
}
