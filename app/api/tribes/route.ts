import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/tribes?wallet=... — get tribe info for a wallet
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()

  // Check if user leads a tribe
  const { data: ownedTribe } = await db
    .from('tribes')
    .select('*, tribe_members(wallet, joined_at)')
    .eq('leader_wallet', wallet)
    .maybeSingle()

  if (ownedTribe) return NextResponse.json({ tribe: ownedTribe, role: 'leader' })

  // Check if user is a member
  const { data: membership } = await db
    .from('tribe_members')
    .select('tribe_id, tribes(*, tribe_members(wallet, joined_at))')
    .eq('wallet', wallet)
    .maybeSingle()

  if (membership?.tribes) return NextResponse.json({ tribe: membership.tribes, role: 'member' })

  return NextResponse.json({ tribe: null, role: null })
}

// POST /api/tribes — create a new tribe
export async function POST(req: Request) {
  const { wallet, name, tag, description, plot_id } = await req.json()
  if (!wallet || !name?.trim() || !tag?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Already leads a tribe?
  const { data: existingLead } = await db
    .from('tribes')
    .select('id')
    .eq('leader_wallet', wallet)
    .maybeSingle()

  if (existingLead) return NextResponse.json({ error: 'Already leading a tribe' }, { status: 400 })

  // Already a member?
  const { data: existingMember } = await db
    .from('tribe_members')
    .select('tribe_id')
    .eq('wallet', wallet)
    .maybeSingle()

  if (existingMember) return NextResponse.json({ error: 'Already in a tribe — leave first' }, { status: 400 })

  // Generate a unique 8-char invite code
  const invite_code = Math.random().toString(36).substring(2, 10).toUpperCase()

  const { data: tribe, error } = await db
    .from('tribes')
    .insert({
      name:          name.trim().slice(0, 32),
      tag:           tag.trim().slice(0, 4).toUpperCase(),
      leader_wallet: wallet,
      description:   description?.trim().slice(0, 120) ?? null,
      plot_id:       plot_id ?? null,
      invite_code,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ tribe })
}
