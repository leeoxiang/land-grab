import { NextResponse } from 'next/server'
import { Pool } from 'pg'

// Direct PostgreSQL connection — bypasses PostgREST schema cache entirely
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

// GET — active players updated in the last 10 seconds
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const exclude = searchParams.get('exclude') ?? ''

  try {
    const { rows } = await pool.query(
      `SELECT wallet, x, y, col, "row", char_id, player_name, pos_updated_at AS updated_at
       FROM players
       WHERE x IS NOT NULL
         AND pos_updated_at > NOW() - INTERVAL '10 seconds'
         AND ($1 = '' OR wallet != $1)`,
      [exclude],
    )
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// POST — upsert own position
export async function POST(req: Request) {
  const { wallet, x, y, col, row, char_id, player_name } = await req.json()
  if (!wallet || x == null || y == null) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    await pool.query(
      `INSERT INTO players (wallet, balance, x, y, col, "row", char_id, player_name, pos_updated_at)
       VALUES ($1, 0, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (wallet) DO UPDATE SET
         x = $2, y = $3, col = $4, "row" = $5, char_id = $6, player_name = $7, pos_updated_at = NOW()`,
      [wallet, x, y, col ?? 0, row ?? 0, char_id ?? 'player', player_name ?? null],
    )
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
