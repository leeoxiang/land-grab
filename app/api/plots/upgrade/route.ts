import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { UPGRADES, MAX_UPGRADE_LEVEL } from '@/config/game'

export async function POST(req: Request) {
  try {
    const { plotId, wallet } = await req.json()
    if (!plotId || !wallet) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const db = supabaseAdmin()

    const { data: plot } = await db.from('plots').select('owner_wallet').eq('id', plotId).single()
    if (!plot) return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
    if (plot.owner_wallet !== wallet) return NextResponse.json({ error: 'Not your plot' }, { status: 403 })

    // upgrade_level may not exist yet — fetch separately and fall back to 1
    let currentLevel = 1
    try {
      const { data: ul } = await db.from('plots').select('upgrade_level').eq('id', plotId).single()
      currentLevel = (ul as unknown as { upgrade_level?: number })?.upgrade_level ?? 1
    } catch { /* column not yet in DB */ }

    if (currentLevel >= MAX_UPGRADE_LEVEL) {
      return NextResponse.json({ error: 'Already at max level' }, { status: 400 })
    }

    const nextLevel  = currentLevel + 1
    const upgradeCfg = UPGRADES[nextLevel]

    try {
      await db.from('plots').update({ upgrade_level: nextLevel }).eq('id', plotId)
    } catch {
      return NextResponse.json({ ok: true, upgrade_level: nextLevel, multiplier: upgradeCfg.multiplier, warning: 'upgrade_level column missing — run schema_additions.sql' })
    }

    return NextResponse.json({ ok: true, upgrade_level: nextLevel, multiplier: upgradeCfg.multiplier })
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
