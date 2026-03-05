import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/tribes/applications?wallet= — returns received (leader) + sent (applicant) applications
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()

  // Applications received (if user leads a tribe)
  const { data: tribe } = await db
    .from('tribes').select('id').eq('leader_wallet', wallet).maybeSingle()

  let received: unknown[] = []
  if (tribe) {
    const { data } = await db
      .from('tribe_applications')
      .select('id, wallet, message, status, created_at')
      .eq('tribe_id', tribe.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    received = data ?? []
  }

  // Applications sent by this wallet
  const { data: sent } = await db
    .from('tribe_applications')
    .select('id, tribe_id, status, tribes(name, tag)')
    .eq('wallet', wallet)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ received, sent: sent ?? [] })
}
