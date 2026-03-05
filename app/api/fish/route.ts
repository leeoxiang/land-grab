import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { FISH, FISH_COOLDOWN_MS, PLOT_TIERS } from '@/config/game'
import type { FishType, PlotTier } from '@/config/game'
import { readFileSync } from 'fs'
import { join } from 'path'

function rollFish(tier: PlotTier): FishType {
  // Higher tiers get a small luck bonus (shift random toward rarer fish)
  const tierBonus = { bronze: 0, silver: 0.02, gold: 0.05, diamond: 0.10 }
  const bonus = tierBonus[tier] ?? 0

  const entries = Object.entries(FISH) as [FishType, typeof FISH[FishType]][]
  const roll    = Math.max(0, Math.random() - bonus)
  let   cumulative = 0

  for (const [key, cfg] of entries) {
    cumulative += cfg.rarity
    if (roll < cumulative) return key
  }
  return 'minnow'
}

// POST /api/fish  { plotId, wallet }
export async function POST(req: Request) {
  const { plotId, wallet } = await req.json()
  if (!plotId || !wallet) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Verify ownership
  const { data: plot } = await db.from('plots').select('*').eq('id', plotId).single()
  if (!plot || plot.owner_wallet !== wallet) {
    return NextResponse.json({ error: 'Not your plot' }, { status: 403 })
  }

  // Check this plot has a pond (from generator sidecar JSON)
  let hasPond = false
  try {
    const padded   = String(plotId).padStart(3, '0')
    const sidecar  = JSON.parse(readFileSync(join(process.cwd(), 'public', 'plots', `plot-${padded}.json`), 'utf8'))
    hasPond        = !!sidecar.hasPond
  } catch {
    // No sidecar yet — allow fishing anyway during development
    hasPond = true
  }

  if (!hasPond) {
    return NextResponse.json({ error: 'This plot has no fishing spot' }, { status: 400 })
  }

  // Check cooldown
  const now = new Date()
  if (plot.last_fish_at) {
    const nextAt = new Date(new Date(plot.last_fish_at).getTime() + FISH_COOLDOWN_MS)
    if (nextAt > now) {
      const msLeft = nextAt.getTime() - now.getTime()
      return NextResponse.json({
        error:    'On cooldown',
        msLeft,
        nextAt:   nextAt.toISOString(),
      }, { status: 429 })
    }
  }

  // Roll for fish
  const fishType = rollFish(plot.tier as PlotTier)
  const fishCfg  = FISH[fishType]

  // Update last_fish_at
  await db.from('plots').update({ last_fish_at: now.toISOString() }).eq('id', plotId)

  // Add to inventory
  await db.from('inventory').upsert({
    player_wallet: wallet,
    item_type:     `fish_${fishType}`,
    quantity:      1,
  }, { onConflict: 'player_wallet,item_type' })

  await db.rpc('increment_inventory', {
    p_wallet:    wallet,
    p_item_type: `fish_${fishType}`,
    p_qty:       1,
  }).maybeSingle()

  const nextFishAt = new Date(now.getTime() + FISH_COOLDOWN_MS)
  return NextResponse.json({
    caught:      fishType,
    name:        fishCfg.name,
    emoji:       fishCfg.emoji,
    sellPrice:   fishCfg.sellPrice,
    nextFishAt:  nextFishAt.toISOString(),
  })
}
