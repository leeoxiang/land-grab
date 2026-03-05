import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const plotId = parseInt(searchParams.get('plotId') ?? '0', 10)
  if (!plotId) return NextResponse.json([])

  const db = supabaseAdmin()
  const { data } = await db
    .from('trees')
    .select('id, tree_type, slot, planted_at, ready_at, last_harvest, next_harvest')
    .eq('plot_id', plotId)
  return NextResponse.json(data ?? [])
}
