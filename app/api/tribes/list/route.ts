import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/tribes/list?search= — ranked tribe directory
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''

  const db = supabaseAdmin()

  let query = db
    .from('tribes')
    .select('id, name, tag, leader_wallet, description, invite_code, created_at, tribe_members(wallet)')
    .limit(50)

  if (search) query = query.ilike('name', `%${search}%`)

  const { data } = await query

  // Sort by member count descending (power ranking)
  const sorted = (data ?? []).sort(
    (a, b) =>
      (b.tribe_members as { wallet: string }[]).length -
      (a.tribe_members as { wallet: string }[]).length,
  )

  return NextResponse.json(sorted)
}
