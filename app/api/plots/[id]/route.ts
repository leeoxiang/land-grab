import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseAdmin()

  const [plot, crops, trees, animals, farmers] = await Promise.all([
    db.from('plots').select('*').eq('id', id).single(),
    db.from('crops').select('*').eq('plot_id', id).eq('harvested', false),
    db.from('trees').select('*').eq('plot_id', id),
    db.from('animals').select('*').eq('plot_id', id),
    db.from('farmers').select('*').eq('plot_id', id),
  ])

  if (plot.error) return NextResponse.json({ error: plot.error.message }, { status: 500 })

  return NextResponse.json({
    ...plot.data,
    crops:   crops.data   ?? [],
    trees:   trees.data   ?? [],
    animals: animals.data ?? [],
    farmers: farmers.data ?? [],
  })
}
