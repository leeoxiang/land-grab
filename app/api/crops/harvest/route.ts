import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CROPS, GOLDEN_HOUR_INTERVAL_MS, GOLDEN_HOUR_DURATION_MS, GOLDEN_HOUR_YIELD_BONUS } from '@/config/game'
import type { CropType } from '@/config/game'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'
import { ensurePlayer } from '@/lib/ensurePlayer'

function isGoldenHour() {
  return (Date.now() % GOLDEN_HOUR_INTERVAL_MS) < GOLDEN_HOUR_DURATION_MS
}

export async function POST(req: Request) {
  const { cropId, wallet } = await req.json()
  if (!cropId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  await ensurePlayer(wallet)
  const db = supabaseAdmin()

  // Get crop + verify ownership via plot (also fetch upgrade_level)
  const { data: crop } = await db
    .from('crops')
    .select('*, plots(id, owner_wallet, upgrade_level, tier)')
    .eq('id', cropId)
    .single()
  if (!crop) return NextResponse.json({ error: 'Crop not found' }, { status: 404 })

  const plot = (crop as unknown as { plots: { id: number; owner_wallet: string; upgrade_level?: number; tier: string } }).plots
  if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your crop' }, { status: 403 })

  if (crop.harvested) return NextResponse.json({ error: 'Already harvested' }, { status: 400 })

  const now = new Date()
  if (new Date(crop.harvest_at) > now) {
    return NextResponse.json({ error: 'Not ready yet' }, { status: 400 })
  }

  const cropCfg = CROPS[crop.crop_type as CropType]

  // Apply upgrade multiplier + golden hour bonus
  const upgradeLevel   = plot.upgrade_level ?? 1
  const baseMultiplier = upgradeLevel >= 4 ? 2.0 : upgradeLevel === 3 ? 1.5 : upgradeLevel === 2 ? 1.25 : 1.0
  const goldenMult     = isGoldenHour() ? 1 + GOLDEN_HOUR_YIELD_BONUS : 1.0

  // Tribe bonus: leader +5% per member, member +10%
  let tribeBonus = 1.0
  const { data: membership } = await db.from('tribe_members').select('tribe_id').eq('wallet', wallet).maybeSingle()
  if (membership) {
    tribeBonus = 1.1
  } else {
    const { data: leadership } = await db.from('tribes').select('tribe_members(wallet)').eq('leader_wallet', wallet).maybeSingle()
    if (leadership) {
      const count = (leadership.tribe_members as { wallet: string }[]).length
      tribeBonus = 1 + count * 0.05
    }
  }

  const multiplier = baseMultiplier * goldenMult * tribeBonus
  const quantity   = Math.max(1, Math.ceil(multiplier))

  // Mark harvested
  await db.from('crops').update({ harvested: true }).eq('id', cropId)

  // Add to inventory via RPC or manual
  const { data: existing } = await db.from('inventory')
    .select('*').eq('player_wallet', wallet).eq('item_type', crop.crop_type).single()

  if (existing) {
    await db.from('inventory').update({ quantity: existing.quantity + quantity }).eq('id', existing.id)
  } else {
    await db.from('inventory').insert({ player_wallet: wallet, item_type: crop.crop_type, quantity })
  }

  // Log event
  await logEvent('harvest_crop', plot.id, wallet, { crop_type: crop.crop_type, quantity })

  // Check achievements (non-blocking)
  const newAchievements = await checkAchievements(wallet, {
    action:          'harvest_crop',
    plotTier:        plot.tier,
  })

  return NextResponse.json({
    harvested:       true,
    item:            crop.crop_type,
    sellPrice:       cropCfg.sellPrice,
    quantity,
    goldenHour:      isGoldenHour(),
    newAchievements,
  })
}
