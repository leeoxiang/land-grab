import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — active players updated in the last 6 seconds
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const exclude = searchParams.get('exclude') ?? ''

  const db = supabaseAdmin()
  const since = new Date(Date.now() - 6000).toISOString()

  const query = db
    .from('player_positions')
    .select('wallet, x, y, col, row, char_id, updated_at')
    .gte('updated_at', since)

  if (exclude) query.neq('wallet', exclude)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

// POST — upsert own position
export async function POST(req: Request) {
  const { wallet, x, y, col, row, char_id } = await req.json()
  if (!wallet || x == null || y == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = supabaseAdmin()
  await db.from('player_positions').upsert(
    { wallet, x, y, col, row: row ?? 0, char_id: char_id ?? 'player', updated_at: new Date().toISOString() },
    { onConflict: 'wallet' },
  )
  return NextResponse.json({ ok: true })
}
