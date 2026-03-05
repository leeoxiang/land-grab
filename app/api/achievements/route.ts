import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ACHIEVEMENT_DEFS } from '@/config/game'

// GET /api/achievements?wallet=xxx
export async function GET(req: Request) {
  const url    = new URL(req.url)
  const wallet = url.searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('achievements')
    .select('*')
    .eq('wallet', wallet)
    .order('unlocked_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enrich with definition data
  const enriched = (data ?? []).map(a => ({
    ...a,
    ...(ACHIEVEMENT_DEFS[a.achievement_id] ?? { label: a.achievement_id, desc: '', icon: '🏅' }),
  }))

  return NextResponse.json(enriched)
}
