import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/inventory?wallet=<wallet>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('inventory')
    .select('*')
    .eq('player_wallet', wallet)
    .gt('quantity', 0)
    .order('item_type')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/inventory  — sell items directly (instant sell at base price)
export async function POST(req: Request) {
  const { wallet, itemType, quantity } = await req.json()
  if (!wallet || !itemType || !quantity) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Check inventory
  const { data: item } = await db.from('inventory')
    .select('*')
    .eq('player_wallet', wallet)
    .eq('item_type', itemType)
    .single()

  if (!item || item.quantity < quantity) {
    return NextResponse.json({ error: 'Insufficient inventory' }, { status: 400 })
  }

  // Deduct from inventory
  await db.from('inventory').update({ quantity: item.quantity - quantity })
    .eq('player_wallet', wallet).eq('item_type', itemType)

  return NextResponse.json({ sold: quantity, itemType })
}
