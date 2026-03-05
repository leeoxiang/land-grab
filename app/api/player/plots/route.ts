import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const wallet = searchParams.get('wallet')
  if (!wallet) return NextResponse.json({ error: 'Missing wallet' }, { status: 400 })

  const db = supabaseAdmin()

  const { data: plots, error } = await db
    .from('plots')
    .select('*')
    .eq('owner_wallet', wallet)
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!plots?.length) return NextResponse.json([])

  const plotIds = plots.map(p => p.id)

  const [crops, animals, farmers] = await Promise.all([
    db.from('crops').select('*').in('plot_id', plotIds).eq('harvested', false),
    db.from('animals').select('*').in('plot_id', plotIds),
    db.from('farmers').select('*').in('plot_id', plotIds),
  ])

  const full = plots.map(plot => ({
    ...plot,
    crops:   (crops.data   ?? []).filter(c => c.plot_id === plot.id),
    animals: (animals.data ?? []).filter(a => a.plot_id === plot.id),
    farmers: (farmers.data ?? []).filter(f => f.plot_id === plot.id),
  }))

  return NextResponse.json(full)
}
