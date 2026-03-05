import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAchievements } from '@/lib/checkAchievements'

// POST /api/referrals  { referrerWallet, referredWallet }
// Called on first wallet connect if ?ref= param was in URL
export async function POST(req: Request) {
  const { referrerWallet, referredWallet } = await req.json()
  if (!referrerWallet || !referredWallet) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (referrerWallet === referredWallet) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Idempotent upsert
  const { error } = await db.from('referrals').upsert(
    { referrer_wallet: referrerWallet, referred_wallet: referredWallet },
    { onConflict: 'referred_wallet', ignoreDuplicates: true },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Reward referrer with 5 wheat if not already rewarded
  const { data: ref } = await db
    .from('referrals')
    .select('rewarded')
    .eq('referred_wallet', referredWallet)
    .single()

  if (ref && !ref.rewarded) {
    await db.rpc('increment_inventory', { p_wallet: referrerWallet, p_item: 'wheat', p_qty: 5 })
    await db.rpc('increment_inventory', { p_wallet: referredWallet,  p_item: 'wheat', p_qty: 3 })
    await db.from('referrals').update({ rewarded: true }).eq('referred_wallet', referredWallet)
    await checkAchievements(referrerWallet, { action: 'referral' })
  }

  return NextResponse.json({ ok: true })
}
