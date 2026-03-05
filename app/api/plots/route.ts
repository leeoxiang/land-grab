import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()

  const [plotsRes, farmersRes] = await Promise.all([
    db.from('plots').select('*').order('id'),
    db.from('farmers').select('plot_id'),
  ])

  if (plotsRes.error) return NextResponse.json({ error: plotsRes.error.message }, { status: 500 })

  // Build farmer count per plot
  const countMap = new Map<number, number>()
  for (const f of farmersRes.data ?? []) {
    countMap.set(f.plot_id, (countMap.get(f.plot_id) ?? 0) + 1)
  }

  const data = (plotsRes.data ?? []).map(p => ({ ...p, farmer_count: countMap.get(p.id) ?? 0 }))
  return NextResponse.json(data)
}
