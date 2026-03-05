import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/marketplace?item_type=wheat&order_type=sell
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const itemType   = searchParams.get('item_type')
  const orderType  = searchParams.get('order_type')

  const db = supabaseAdmin()
  let query = db.from('marketplace_orders').select('*').eq('status', 'open').order('price_per_unit')

  if (itemType)  query = query.eq('item_type', itemType)
  if (orderType) query = query.eq('order_type', orderType)

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/marketplace — place a buy or sell order
export async function POST(req: Request) {
  const { wallet, itemType, quantity, pricePerUnit, orderType } = await req.json()
  if (!wallet || !itemType || !quantity || !pricePerUnit || !orderType) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!['buy', 'sell'].includes(orderType)) {
    return NextResponse.json({ error: 'order_type must be buy or sell' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // For sell orders: verify inventory
  if (orderType === 'sell') {
    const { data: inv } = await db.from('inventory')
      .select('*').eq('player_wallet', wallet).eq('item_type', itemType).single()
    if (!inv || inv.quantity < quantity) {
      return NextResponse.json({ error: 'Insufficient inventory' }, { status: 400 })
    }
    // Reserve inventory
    await db.from('inventory').update({ quantity: inv.quantity - quantity }).eq('id', inv.id)
  }

  // Create order
  const { data: order, error } = await db.from('marketplace_orders').insert({
    player_wallet:  wallet,
    item_type:      itemType,
    quantity,
    price_per_unit: pricePerUnit,
    order_type:     orderType,
    status:         'open',
    created_at:     new Date().toISOString(),
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Try to match orders
  await matchOrders(db, itemType)

  return NextResponse.json({ order })
}

async function matchOrders(db: ReturnType<typeof import('@/lib/supabase').supabaseAdmin>, itemType: string) {
  const FEE = 0.025

  // Get best sell order (lowest price)
  const { data: sellOrders } = await db.from('marketplace_orders')
    .select('*').eq('item_type', itemType).eq('order_type', 'sell').eq('status', 'open')
    .order('price_per_unit', { ascending: true }).limit(10)

  // Get best buy order (highest price)
  const { data: buyOrders } = await db.from('marketplace_orders')
    .select('*').eq('item_type', itemType).eq('order_type', 'buy').eq('status', 'open')
    .order('price_per_unit', { ascending: false }).limit(10)

  if (!sellOrders?.length || !buyOrders?.length) return

  for (const sell of sellOrders) {
    for (const buy of buyOrders) {
      if (buy.price_per_unit < sell.price_per_unit) break
      if (sell.player_wallet === buy.player_wallet) continue

      const qty  = Math.min(sell.quantity, buy.quantity)
      const price = sell.price_per_unit
      const gross = qty * price
      const fee   = gross * FEE
      const net   = gross - fee

      // Update sell order
      const newSellQty = sell.quantity - qty
      await db.from('marketplace_orders').update({
        quantity: newSellQty,
        status: newSellQty <= 0 ? 'filled' : 'open',
      }).eq('id', sell.id)

      // Update buy order
      const newBuyQty = buy.quantity - qty
      await db.from('marketplace_orders').update({
        quantity: newBuyQty,
        status: newBuyQty <= 0 ? 'filled' : 'open',
      }).eq('id', buy.id)

      // Credit seller (net after fee)
      await db.from('player_balances').upsert({
        wallet: sell.player_wallet,
        balance_usdc: db.rpc as unknown as number, // placeholder — real credit via token transfer
      })

      // Give buyer their items
      const { data: buyerInv } = await db.from('inventory')
        .select('*').eq('player_wallet', buy.player_wallet).eq('item_type', itemType).single()
      if (buyerInv) {
        await db.from('inventory').update({ quantity: buyerInv.quantity + qty }).eq('id', buyerInv.id)
      } else {
        await db.from('inventory').insert({ player_wallet: buy.player_wallet, item_type: itemType, quantity: qty })
      }

      if (newSellQty <= 0) break
    }
  }
}
