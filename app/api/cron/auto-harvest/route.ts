// Vercel cron job — runs every minute to auto-harvest for plots that have farmers
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/auto-harvest", "schedule": "* * * * *" }] }
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CROPS, ANIMALS, FARMERS } from '@/config/game'
import type { CropType, AnimalType, FarmerType } from '@/config/game'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Protect with a secret
  const { searchParams } = new URL(req.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db  = supabaseAdmin()
  const now = new Date()

  // Get all plots that have at least one farmer
  const { data: farmerPlots } = await db
    .from('farmers')
    .select('plot_id, farmer_type, plots(owner_wallet, tier)')
    .not('plot_id', 'is', null)

  if (!farmerPlots?.length) return NextResponse.json({ processed: 0 })

  const plotIds = [...new Set(farmerPlots.map(f => f.plot_id))]
  let processed = 0

  for (const plotId of plotIds) {
    const farmers = farmerPlots.filter(f => f.plot_id === plotId)
    // Find best farmer on this plot
    const bestFarmer = farmers.reduce((best, f) => {
      const speed = FARMERS[f.farmer_type as FarmerType].speed
      return speed > FARMERS[best.farmer_type as FarmerType].speed ? f : best
    })
    const farmerCfg = FARMERS[bestFarmer.farmer_type as FarmerType]
    const plot = (bestFarmer as unknown as { plots: { owner_wallet: string } }).plots

    // Auto-harvest ready crops
    const { data: readyCrops } = await db
      .from('crops')
      .select('*')
      .eq('plot_id', plotId)
      .eq('harvested', false)
      .lte('harvest_at', now.toISOString())

    for (const crop of readyCrops ?? []) {
      const cropCfg = CROPS[crop.crop_type as CropType]
      await db.from('crops').update({ harvested: true }).eq('id', crop.id)

      // Add to inventory
      const { data: inv } = await db.from('inventory')
        .select('*').eq('player_wallet', plot.owner_wallet).eq('item_type', crop.crop_type).single()
      if (inv) {
        await db.from('inventory').update({ quantity: inv.quantity + 1 }).eq('id', inv.id)
      } else {
        await db.from('inventory').insert({ player_wallet: plot.owner_wallet, item_type: crop.crop_type, quantity: 1 })
      }

      // Auto-replant same crop type
      const growMs  = cropCfg.growMs / farmerCfg.speed
      const harvestAt = new Date(now.getTime() + growMs)
      await db.from('crops').insert({
        plot_id:    plotId,
        slot:       crop.slot,
        crop_type:  crop.crop_type,
        planted_at: now.toISOString(),
        harvest_at: harvestAt.toISOString(),
        harvested:  false,
      })
      processed++
    }

    // Auto-harvest ready animals
    const { data: readyAnimals } = await db
      .from('animals')
      .select('*')
      .eq('plot_id', plotId)
      .lte('next_harvest', now.toISOString())

    for (const animal of readyAnimals ?? []) {
      const ac = ANIMALS[animal.animal_type as AnimalType]
      const nextHarvest = new Date(now.getTime() + ac.harvestMs)
      await db.from('animals').update({ last_harvest: now.toISOString(), next_harvest: nextHarvest.toISOString() }).eq('id', animal.id)

      const { data: inv } = await db.from('inventory')
        .select('*').eq('player_wallet', plot.owner_wallet).eq('item_type', ac.produces).single()
      if (inv) {
        await db.from('inventory').update({ quantity: inv.quantity + ac.yield }).eq('id', inv.id)
      } else {
        await db.from('inventory').insert({ player_wallet: plot.owner_wallet, item_type: ac.produces, quantity: ac.yield })
      }
      processed++
    }
  }

  return NextResponse.json({ processed, timestamp: now.toISOString() })
}
