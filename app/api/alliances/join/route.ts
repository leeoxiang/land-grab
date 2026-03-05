import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ALLIANCE_MAX_MEMBERS } from '@/config/game'
import { checkAchievements } from '@/lib/checkAchievements'

// POST /api/alliances/join  { allianceId, wallet }
export async function POST(req: Request) {
  const { allianceId, wallet } = await req.json()
  if (!allianceId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  // Check not already in an alliance
  const { data: existing } = await db
    .from('alliance_members')
    .select('alliance_id')
    .eq('wallet', wallet)
    .single()
  if (existing) return NextResponse.json({ error: 'Already in an alliance. Leave first.' }, { status: 400 })

  // Check member cap
  const { count } = await db
    .from('alliance_members')
    .select('*', { count: 'exact', head: true })
    .eq('alliance_id', allianceId)
  if ((count ?? 0) >= ALLIANCE_MAX_MEMBERS) {
    return NextResponse.json({ error: `Alliance is full (max ${ALLIANCE_MAX_MEMBERS} members)` }, { status: 400 })
  }

  const { error } = await db.from('alliance_members').insert({ alliance_id: allianceId, wallet })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await checkAchievements(wallet, { action: 'alliance_join' })

  return NextResponse.json({ ok: true })
}
