import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/trades?status=open  — list open trade offers
export async function GET(req: Request) {
  const url    = new URL(req.url)
  const status = url.searchParams.get('status') ?? 'open'

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('trade_offers')
    .select('*, plots(id,tier,col,row,custom_name,upgrade_level)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/trades  { plotId, sellerWallet, priceUsdc, buyerWallet? }
export async function POST(req: Request) {
  const { plotId, sellerWallet, priceUsdc, buyerWallet } = await req.json()
  if (!plotId || !sellerWallet || !priceUsdc) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (priceUsdc <= 0) return NextResponse.json({ error: 'Price must be > 0' }, { status: 400 })

  const db = supabaseAdmin()

  // Verify ownership
  const { data: plot } = await db.from('plots').select('owner_wallet').eq('id', plotId).single()
  if (!plot || plot.owner_wallet !== sellerWallet) {
    return NextResponse.json({ error: 'Not your plot' }, { status: 403 })
  }

  // Cancel any existing open offer for this plot
  await db.from('trade_offers')
    .update({ status: 'cancelled' })
    .eq('plot_id', plotId)
    .eq('status', 'open')

  const { data: offer, error } = await db
    .from('trade_offers')
    .insert({
      plot_id:       plotId,
      seller_wallet: sellerWallet,
      buyer_wallet:  buyerWallet ?? null,
      price_usdc:    priceUsdc,
      status:        'open',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offer })
}
