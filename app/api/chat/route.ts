import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

export async function GET() {
  try {
    const { rows } = await pool.query(
      `SELECT id, wallet, message, created_at
       FROM chat_messages
       ORDER BY created_at ASC
       LIMIT 80`,
    )
    return NextResponse.json(rows)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const { wallet, message } = await req.json()
  if (!wallet || !message?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  const text = String(message).trim().slice(0, 120)

  try {
    // Rate-limit: max 1 message per 3 seconds per wallet
    const { rows: recent } = await pool.query(
      `SELECT id FROM chat_messages WHERE wallet = $1 AND created_at > NOW() - INTERVAL '3 seconds' LIMIT 1`,
      [wallet],
    )
    if (recent.length > 0) {
      return NextResponse.json({ error: 'Slow down' }, { status: 429 })
    }

    const { rows } = await pool.query(
      `INSERT INTO chat_messages (wallet, message) VALUES ($1, $2)
       RETURNING id, wallet, message, created_at`,
      [wallet, text],
    )
    return NextResponse.json(rows[0])
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
