import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ANIMALS, PLOT_TIERS } from '@/config/game'
import type { AnimalType, PlotTier } from '@/config/game'
import { logEvent } from '@/lib/logEvent'
import { checkAchievements } from '@/lib/checkAchievements'

export async function POST(req: Request) {
  try {
    const { plotId, animalType, wallet } = await req.json()
    if (!plotId || !animalType || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const animalCfg = ANIMALS[animalType as AnimalType]
    if (!animalCfg) return NextResponse.json({ error: 'Invalid animal type' }, { status: 400 })

    const db = supabaseAdmin()

    const { data: plot } = await db.from('plots').select('owner_wallet, tier').eq('id', plotId).single()
    if (!plot || plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

    const tierCfg = PLOT_TIERS[plot.tier as PlotTier]
    const { count } = await db.from('animals').select('*', { count: 'exact', head: true }).eq('plot_id', plotId)
    if ((count ?? 0) >= tierCfg.animalSlots) return NextResponse.json({ error: 'Animal slots full' }, { status: 400 })

    const now         = new Date()
    const nextHarvest = new Date(now.getTime() + animalCfg.harvestMs)

    const { data: animal, error } = await db.from('animals').insert({
      plot_id:      plotId,
      animal_type:  animalType,
      purchased_at: now.toISOString(),
      last_harvest: null,
      next_harvest: nextHarvest.toISOString(),
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try { await logEvent('buy_animal', plotId, wallet, { animal_type: animalType }) } catch { /* non-critical */ }
    let newAchievements: string[] = []
    try {
      newAchievements = await checkAchievements(wallet, { action: 'buy_animal', animalCount: (count ?? 0) + 1 })
    } catch { /* non-critical */ }

    return NextResponse.json({ animal, newAchievements })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
