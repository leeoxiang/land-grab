import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { CROPS } from '@/config/game'
import type { CropType } from '@/config/game'

export async function POST(req: Request) {
  const { cropId, wallet } = await req.json()
  if (!cropId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  // Get crop + verify ownership via plot (also fetch upgrade_level)
  const { data: crop } = await db.from('crops').select('*, plots(owner_wallet, upgrade_level)').eq('id', cropId).single()
  if (!crop) return NextResponse.json({ error: 'Crop not found' }, { status: 404 })

  const plot = (crop as unknown as { plots: { owner_wallet: string; upgrade_level?: number } }).plots
  if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your crop' }, { status: 403 })

  if (crop.harvested) return NextResponse.json({ error: 'Already harvested' }, { status: 400 })

  const now = new Date()
  if (new Date(crop.harvest_at) > now) {
    return NextResponse.json({ error: 'Not ready yet' }, { status: 400 })
  }

  const cropCfg = CROPS[crop.crop_type as CropType]

  // Apply upgrade multiplier
  const upgradeLevel = plot.upgrade_level ?? 1
  const multiplier = upgradeLevel >= 4 ? 2.0 : upgradeLevel === 3 ? 1.5 : upgradeLevel === 2 ? 1.25 : 1.0
  const quantity = Math.max(1, Math.ceil(multiplier))

  // Mark harvested
  await db.from('crops').update({ harvested: true }).eq('id', cropId)

  // Add to inventory
  const { data: existing } = await db.from('inventory')
    .select('*').eq('player_wallet', wallet).eq('item_type', crop.crop_type).single()

  if (existing) {
    await db.from('inventory').update({ quantity: existing.quantity + quantity }).eq('id', existing.id)
  } else {
    await db.from('inventory').insert({ player_wallet: wallet, item_type: crop.crop_type, quantity })
  }

  return NextResponse.json({ harvested: true, item: crop.crop_type, sellPrice: cropCfg.sellPrice, quantity })
}
