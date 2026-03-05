import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { UPGRADES, MAX_UPGRADE_LEVEL } from '@/config/game'

export async function POST(req: Request) {
  const { plotId, wallet } = await req.json()
  if (!plotId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: plot } = await db.from('plots').select('owner_wallet, upgrade_level').eq('id', plotId).single()
  if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
  if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

  const currentLevel = plot.upgrade_level ?? 1
  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return NextResponse.json({ error: 'Already at max level' }, { status: 400 })
  }

  const nextLevel = currentLevel + 1
  const upgradeCfg = UPGRADES[nextLevel]

  const { error } = await db.from('plots').update({ upgrade_level: nextLevel }).eq('id', plotId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, upgrade_level: nextLevel, multiplier: upgradeCfg.multiplier })
}
