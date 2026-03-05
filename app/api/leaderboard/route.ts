import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const TIER_POINTS: Record<string, number> = {
  diamond: 100,
  gold:    50,
  silver:  20,
  bronze:  10,
}

const TIER_RANK: Record<string, number> = {
  diamond: 4, gold: 3, silver: 2, bronze: 1,
}

export async function GET() {
  const db = supabaseAdmin()

  const { data: plots } = await db
    .from('plots')
    .select('owner_wallet, tier, custom_name, upgrade_level')
    .not('owner_wallet', 'is', null)

  if (!plots) return NextResponse.json([])

  const walletMap = new Map<string, {
    plots: number
    score: number
    topTier: string
    topName: string | null
    maxUpgrade: number
  }>()

  for (const p of plots) {
    const w = p.owner_wallet!
    const existing = walletMap.get(w) ?? { plots: 0, score: 0, topTier: 'bronze', topName: null, maxUpgrade: 1 }
    const pts = TIER_POINTS[p.tier] ?? 10
    existing.plots++
    existing.score += pts
    if ((TIER_RANK[p.tier] ?? 0) > (TIER_RANK[existing.topTier] ?? 0)) {
      existing.topTier = p.tier
      existing.topName = p.custom_name ?? null
    }
    if ((p.upgrade_level ?? 1) > existing.maxUpgrade) {
      existing.maxUpgrade = p.upgrade_level ?? 1
    }
    walletMap.set(w, existing)
  }

  const ranked = Array.from(walletMap.entries())
    .map(([wallet, data]) => ({ wallet, ...data }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return NextResponse.json(ranked)
}
