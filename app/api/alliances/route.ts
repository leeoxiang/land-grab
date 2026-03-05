import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ALLIANCE_MAX_MEMBERS } from '@/config/game'
import { checkAchievements } from '@/lib/checkAchievements'

// GET /api/alliances?wallet=xxx  — lists all alliances; wallet param shows membership
export async function GET(req: Request) {
  const url    = new URL(req.url)
  const wallet = url.searchParams.get('wallet')

  const db = supabaseAdmin()

  const { data: alliances, error } = await db
    .from('alliances')
    .select('*, alliance_members(count)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let myAlliance: number | null = null
  if (wallet) {
    const { data: membership } = await db
      .from('alliance_members')
      .select('alliance_id')
      .eq('wallet', wallet)
      .single()
    myAlliance = membership?.alliance_id ?? null
  }

  const result = (alliances ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    member_count: Array.isArray(a.alliance_members)
      ? (a.alliance_members as Array<{count: number}>)[0]?.count ?? 0
      : 0,
    is_member: myAlliance === a.id,
  }))

  return NextResponse.json({ alliances: result, myAllianceId: myAlliance })
}

// POST /api/alliances  { name, tag, wallet }  — create alliance
export async function POST(req: Request) {
  const { name, tag, wallet } = await req.json()
  if (!name || !tag || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (tag.length > 4) return NextResponse.json({ error: 'Tag max 4 chars' }, { status: 400 })

  const db = supabaseAdmin()

  // Check not already in an alliance
  const { data: existing } = await db
    .from('alliance_members')
    .select('alliance_id')
    .eq('wallet', wallet)
    .single()
  if (existing) return NextResponse.json({ error: 'Already in an alliance' }, { status: 400 })

  const { data: alliance, error } = await db
    .from('alliances')
    .insert({ name: name.trim().slice(0, 32), tag: tag.toUpperCase().trim(), leader_wallet: wallet })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-join as member
  await db.from('alliance_members').insert({ alliance_id: alliance.id, wallet })
  await checkAchievements(wallet, { action: 'alliance_join' })

  return NextResponse.json({ alliance })
}
