/**
 * GET /api/goblins?plotId=N
 *
 * Returns active goblin guards on a plot (not yet expired).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const plotId = searchParams.get('plotId')
  if (!plotId) return NextResponse.json({ error: 'Missing plotId' }, { status: 400 })

  const db  = supabaseAdmin()
  const now = new Date().toISOString()

  const { data, error } = await db
    .from('goblins')
    .select('id, tier, hired_at, expires_at')
    .eq('plot_id', Number(plotId))
    .gt('expires_at', now)
    .order('expires_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
