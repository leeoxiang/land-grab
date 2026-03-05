import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Daily bonus items awarded on first login of each day
const BONUS_ITEMS = [
  { item_type: 'wheat', quantity: 3 },
]

export async function POST(req: Request) {
  const { wallet } = await req.json()
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()

  // Upsert player record
  await db.from('players').upsert(
    { wallet, updated_at: new Date().toISOString() },
    { onConflict: 'wallet' },
  )

  // Award bonus items to inventory
  for (const item of BONUS_ITEMS) {
    const { data: existing } = await db
      .from('inventory')
      .select('*')
      .eq('player_wallet', wallet)
      .eq('item_type', item.item_type)
      .single()

    if (existing) {
      await db.from('inventory')
        .update({ quantity: existing.quantity + item.quantity })
        .eq('id', existing.id)
    } else {
      await db.from('inventory').insert({
        player_wallet: wallet,
        item_type:     item.item_type,
        quantity:      item.quantity,
      })
    }
  }

  return NextResponse.json({ ok: true, bonus: BONUS_ITEMS })
}
