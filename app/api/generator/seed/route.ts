/**
 * POST /api/generator/seed
 *
 * One-time setup: reads public/plots/plots-metadata.json and upserts all
 * 100 plots into the Supabase `plots` table.
 *
 * Plots are arranged in a 10×10 grid:
 *   plot 1  → col=0, row=0
 *   plot 2  → col=1, row=0
 *   plot 10 → col=9, row=0
 *   plot 11 → col=0, row=1 … etc.
 *
 * Safe to call multiple times (upsert is idempotent).
 * Protect with a secret in production: POST { secret: process.env.SEED_SECRET }
 */
import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { supabaseAdmin } from '@/lib/supabase'

interface PlotMeta {
  plotNumber:     number
  tier:           'bronze' | 'silver' | 'gold' | 'diamond'
  layout:         string
  hasPond:        boolean
  hasWindmill:    boolean
  treeCount:      number
  farmlandBlocks: number
  animals:        string[]
  hasBeehive:     boolean
  hasPath:        boolean
  score:          number
}

export async function POST(req: Request) {
  // Basic protection
  const { secret } = await req.json().catch(() => ({ secret: '' }))
  if (process.env.SEED_SECRET && secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const metaPath = join(process.cwd(), 'public', 'plots', 'plots-metadata.json')
  let allMeta: PlotMeta[]
  try {
    allMeta = JSON.parse(await readFile(metaPath, 'utf8'))
  } catch {
    return NextResponse.json({ error: 'plots-metadata.json not found — generate plots first' }, { status: 400 })
  }

  const db = supabaseAdmin()

  // Build rows: map plotNumber 1-100 to (col, row) in 10×10 grid
  const rows = allMeta.map(meta => ({
    id:           meta.plotNumber,
    tier:         meta.tier,
    col:          (meta.plotNumber - 1) % 10,
    row:          Math.floor((meta.plotNumber - 1) / 10),
    owner_wallet: null,
    locked_tokens: 0,
    claimed_at:   null,
    last_fish_at: null,
  }))

  const { error, data } = await db
    .from('plots')
    .upsert(rows, { onConflict: 'id' })
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Tier distribution summary
  const tiers: Record<string, number> = {}
  const layouts: Record<string, number> = {}
  const ponds = allMeta.filter(m => m.hasPond).length
  const windmills = allMeta.filter(m => m.hasWindmill).length
  allMeta.forEach(m => {
    tiers[m.tier]     = (tiers[m.tier]   ?? 0) + 1
    layouts[m.layout] = (layouts[m.layout] ?? 0) + 1
  })

  return NextResponse.json({
    ok:       true,
    seeded:   data?.length ?? rows.length,
    tiers,
    layouts,
    ponds,
    windmills,
  })
}
