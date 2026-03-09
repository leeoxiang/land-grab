import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/plots/view  { plotId }
// Increments view_count on a plot (called when PlotModal opens)
export async function POST(req: Request) {
  const { plotId } = await req.json()
  if (!plotId) return NextResponse.json({ error: 'Missing plotId' }, { status: 400 })

  try {
    const db = supabaseAdmin()
    const { data, error } = await db.rpc('increment_view_count', { pid: plotId })

    if (error) {
      // Fallback: manual increment if RPC not created yet
      const { data: plot } = await db.from('plots').select('view_count').eq('id', plotId).single()
      const newCount = ((plot as unknown as { view_count?: number })?.view_count ?? 0) + 1
      await db.from('plots').update({ view_count: newCount }).eq('id', plotId)
      return NextResponse.json({ view_count: newCount })
    }

    return NextResponse.json({ view_count: data })
  } catch {
    // view_count column may not exist yet — non-critical, ignore
    return NextResponse.json({ view_count: 0 })
  }
}
