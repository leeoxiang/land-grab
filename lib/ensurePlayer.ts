import { supabaseAdmin } from './supabase'

/**
 * Ensures a player row exists in the `players` table.
 * Safe to call before any inventory operation to prevent FK violations.
 */
export async function ensurePlayer(wallet: string): Promise<void> {
  const db = supabaseAdmin()
  await db
    .from('players')
    .upsert({ wallet, balance: 0 }, { onConflict: 'wallet', ignoreDuplicates: true })
}
