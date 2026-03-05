import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET — active players updated in the last 10 seconds (via RPC, bypasses schema cache)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const exclude = searchParams.get('exclude') ?? ''

  const db = supabaseAdmin()
  const { data, error } = await db.rpc('get_active_players', { exclude_wallet: exclude })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — upsert own position (via RPC, bypasses schema cache)
export async function POST(req: Request) {
  const { wallet, x, y, col, row, char_id } = await req.json()
  if (!wallet || x == null || y == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = supabaseAdmin()
  const { error } = await db.rpc('upsert_player_position', {
    p_wallet:  wallet,
    p_x:       x,
    p_y:       y,
    p_col:     col  ?? 0,
    p_row:     row  ?? 0,
    p_char_id: char_id ?? 'player',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
