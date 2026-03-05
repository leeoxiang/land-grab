import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ANIMALS, GOLDEN_HOUR_INTERVAL_MS, GOLDEN_HOUR_DURATION_MS, GOLDEN_HOUR_YIELD_BONUS } from '@/config/game'
import type { AnimalType } from '@/config/game'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'

function isGoldenHour() {
  return (Date.now() % GOLDEN_HOUR_INTERVAL_MS) < GOLDEN_HOUR_DURATION_MS
}

export async function POST(req: Request) {
  const { animalId, wallet } = await req.json()
  if (!animalId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: animal } = await db
    .from('animals')
    .select('*, plots(id, owner_wallet, upgrade_level, tier)')
    .eq('id', animalId)
    .single()
  if (!animal) return NextResponse.json({ error: 'Animal not found' }, { status: 404 })

  const plot = (animal as unknown as { plots: { id: number; owner_wallet: string; upgrade_level?: number; tier: string } }).plots
  if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your animal' }, { status: 403 })

  const now = new Date()
  if (animal.next_harvest && new Date(animal.next_harvest) > now) {
    return NextResponse.json({ error: 'Not ready yet' }, { status: 400 })
  }

  const animalCfg   = ANIMALS[animal.animal_type as AnimalType]
  const nextHarvest = new Date(now.getTime() + animalCfg.harvestMs)

  // Apply upgrade multiplier + golden hour bonus
  const upgradeLevel   = plot.upgrade_level ?? 1
  const baseMultiplier = upgradeLevel >= 4 ? 2.0 : upgradeLevel === 3 ? 1.5 : upgradeLevel === 2 ? 1.25 : 1.0
  const multiplier     = isGoldenHour() ? baseMultiplier * (1 + GOLDEN_HOUR_YIELD_BONUS) : baseMultiplier
  const amount         = Math.max(1, Math.round(animalCfg.yield * multiplier))

  await db.from('animals').update({
    last_harvest: now.toISOString(),
    next_harvest: nextHarvest.toISOString(),
  }).eq('id', animalId)

  // Add to inventory
  const { data: existing } = await db.from('inventory')
    .select('*').eq('player_wallet', wallet).eq('item_type', animalCfg.produces).single()

  if (existing) {
    await db.from('inventory').update({ quantity: existing.quantity + amount }).eq('id', existing.id)
  } else {
    await db.from('inventory').insert({ player_wallet: wallet, item_type: animalCfg.produces, quantity: amount })
  }

  // Count animals for achievement check
  const { count: animalCount } = await db
    .from('animals')
    .select('*', { count: 'exact', head: true })
    .eq('plot_id', animal.plot_id)

  // Log event
  await logEvent('harvest_animal', plot.id, wallet, { animal_type: animal.animal_type, amount })

  // Check achievements
  const newAchievements = await checkAchievements(wallet, {
    action:      'harvest_animal',
    animalCount: animalCount ?? 0,
    plotTier:    plot.tier,
  })

  return NextResponse.json({
    harvested:       true,
    item:            animalCfg.produces,
    amount,
    goldenHour:      isGoldenHour(),
    newAchievements,
  })
}
