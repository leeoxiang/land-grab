import { supabaseAdmin } from './supabase'

export type EventType =
  | 'claim'
  | 'harvest_crop'
  | 'harvest_animal'
  | 'harvest_tree'
  | 'buy_animal'
  | 'plant_crop'
  | 'plant_tree'
  | 'upgrade'
  | 'fish'
  | 'trade_create'
  | 'trade_accept'
  | 'hire_farmer'
  | 'abandon'

export async function logEvent(
  eventType: EventType,
  plotId: number | null,
  wallet: string | null,
  detail: Record<string, unknown> = {},
) {
  try {
    const db = supabaseAdmin()
    await db.from('plot_events').insert({ event_type: eventType, plot_id: plotId, wallet, detail })
  } catch {
    // Non-critical — never let event logging break a route
  }
}
