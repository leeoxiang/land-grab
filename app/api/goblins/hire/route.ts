/**
 * POST /api/goblins/hire
 *
 * Hire goblin guards to defend a plot.
 * Body: { plotId: number, wallet: string, tier: 'scout'|'guard'|'warlord', hours: number }
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { GOBLINS } from '@/config/game'
import type { GoblinTier } from '@/config/game'

export async function POST(req: Request) {
  const { plotId, wallet, tier, hours } = await req.json()
  if (!plotId || !wallet || !tier || !hours) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (!GOBLINS[tier as GoblinTier]) {
    return NextResponse.json({ error: 'Invalid goblin tier' }, { status: 400 })
  }
  if (hours < 1 || hours > 168) {
    return NextResponse.json({ error: 'Hours must be 1–168' }, { status: 400 })
  }

  const db  = supabaseAdmin()
  const now = new Date()

  // Verify ownership
  const { data: plot } = await db.from('plots').select('owner_wallet').eq('id', plotId).single()
  if (!plot)                           return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
  if (plot.owner_wallet !== wallet)    return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

  const cfg  = GOBLINS[tier as GoblinTier]
  const cost = cfg.costPerHour * hours
  // Balance deduction wired to on-chain token later (same pattern as crops/animals/farmers)
  void cost  // suppress unused-var lint until on-chain billing is added

  // Insert goblin record
  const expiresAt = new Date(now.getTime() + hours * 3600000)
  const { data, error } = await db.from('goblins').insert({
    plot_id:    plotId,
    tier,
    hired_at:   now.toISOString(),
    expires_at: expiresAt.toISOString(),
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok:        true,
    goblinId:  data.id,
    tier,
    expiresAt: expiresAt.toISOString(),
    cost,
  })
}
