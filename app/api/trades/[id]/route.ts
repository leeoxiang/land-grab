import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'

// POST /api/trades/[id]  { action: 'accept'|'cancel', wallet }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { action, wallet } = await req.json()
  const { id } = await params
  const offerId = parseInt(id, 10)

  if (!action || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: offer } = await db
    .from('trade_offers')
    .select('*, plots(*)')
    .eq('id', offerId)
    .single()

  if (!offer) return NextResponse.json({ error: 'Offer not found' }, { status: 404 })
  if (offer.status !== 'open') return NextResponse.json({ error: 'Offer already closed' }, { status: 400 })

  if (action === 'cancel') {
    if (offer.seller_wallet !== wallet) return NextResponse.json({ error: 'Not your offer' }, { status: 403 })
    await db.from('trade_offers').update({ status: 'cancelled' }).eq('id', offerId)
    return NextResponse.json({ ok: true })
  }

  if (action === 'accept') {
    // Targeted offer check
    if (offer.buyer_wallet && offer.buyer_wallet !== wallet) {
      return NextResponse.json({ error: 'This offer is for another wallet' }, { status: 403 })
    }
    if (offer.seller_wallet === wallet) {
      return NextResponse.json({ error: 'Cannot accept your own offer' }, { status: 400 })
    }

    // Transfer plot ownership
    const { error } = await db
      .from('plots')
      .update({ owner_wallet: wallet, claimed_at: new Date().toISOString() })
      .eq('id', offer.plot_id)
      .eq('owner_wallet', offer.seller_wallet) // Ensure seller still owns it

    if (error) return NextResponse.json({ error: 'Transfer failed — plot may have been reclaimed' }, { status: 500 })

    // Mark offer accepted
    await db.from('trade_offers')
      .update({ status: 'accepted', buyer_wallet: wallet })
      .eq('id', offerId)

    // Log event + check achievements
    await logEvent('trade_accept', offer.plot_id, wallet, {
      seller: offer.seller_wallet,
      price:  offer.price_usdc,
    })
    await checkAchievements(wallet, { action: 'trade_accept' })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
