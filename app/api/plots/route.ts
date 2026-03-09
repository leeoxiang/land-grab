import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const db = supabaseAdmin()

  const [plotsRes, farmersRes, animalsRes] = await Promise.all([
    db.from('plots').select('*').order('id'),
    db.from('farmers').select('plot_id'),
    db.from('animals').select('plot_id, animal_type, slot'),
  ])

  if (plotsRes.error) return NextResponse.json({ error: plotsRes.error.message }, { status: 500 })

  // Build farmer count per plot
  const countMap = new Map<number, number>()
  for (const f of farmersRes.data ?? []) {
    countMap.set(f.plot_id, (countMap.get(f.plot_id) ?? 0) + 1)
  }

  // Build plot_animals per plot — slot-aware for correct WorldScene positioning
  const animalMap = new Map<number, { type: string; slot: number }[]>()
  for (const a of animalsRes.data ?? []) {
    const existing = animalMap.get(a.plot_id) ?? []
    existing.push({ type: a.animal_type, slot: a.slot ?? 0 })
    animalMap.set(a.plot_id, existing)
  }

  const data = (plotsRes.data ?? []).map(p => ({
    ...p,
    farmer_count: countMap.get(p.id) ?? 0,
    plot_animals: animalMap.get(p.id) ?? [],
  }))
  return NextResponse.json(data)
}
