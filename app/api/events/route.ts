import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/events?limit=20
// Returns the latest plot events for the activity feed
export async function GET(req: Request) {
  const url   = new URL(req.url)
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') ?? '20', 10))

  const db = supabaseAdmin()
  const { data, error } = await db
    .from('plot_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
