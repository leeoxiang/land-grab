import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — active players updated in the last 10 seconds
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const exclude = searchParams.get('exclude') ?? ''

  const db    = supabaseAdmin()
  const since = new Date(Date.now() - 10000).toISOString()

  let query = db
    .from('players')
    .select('wallet, x, y, col, row, char_id, pos_updated_at')
    .not('x', 'is', null)
    .gte('pos_updated_at', since)

  if (exclude) query = query.neq('wallet', exclude)

  const { data } = await query
  // Rename pos_updated_at → updated_at so the client doesn't change
  return NextResponse.json(
    (data ?? []).map(({ pos_updated_at, ...rest }) => ({ ...rest, updated_at: pos_updated_at }))
  )
}

// POST — upsert own position into the players table
export async function POST(req: Request) {
  const { wallet, x, y, col, row, char_id } = await req.json()
  if (!wallet || x == null || y == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { error } = await db.from('players').upsert(
    {
      wallet,
      x,
      y,
      col:            col  ?? 0,
      row:            row  ?? 0,
      char_id:        char_id ?? 'player',
      pos_updated_at: new Date().toISOString(),
      balance:        0,   // required NOT NULL default — ignored on conflict
    },
    { onConflict: 'wallet' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
