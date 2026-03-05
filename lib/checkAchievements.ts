import { supabaseAdmin } from './supabase'
import { ACHIEVEMENT_DEFS } from '@/config/game'

/** Unlock an achievement for a wallet. Returns the achievement_id if newly unlocked, else null. */
export async function unlockAchievement(wallet: string, achievementId: string): Promise<string | null> {
  if (!ACHIEVEMENT_DEFS[achievementId]) return null
  try {
    const db = supabaseAdmin()
    const { error } = await db
      .from('achievements')
      .insert({ wallet, achievement_id: achievementId })
    // If no error, it was newly inserted
    if (!error) return achievementId
    // If unique violation (already unlocked) — silently ignore
    return null
  } catch {
    return null
  }
}

/** Check and unlock all applicable achievements for a wallet after an action. */
export async function checkAchievements(
  wallet: string,
  context: {
    action?: string
    cropHarvestCount?: number
    animalCount?: number
    plotTier?: string
    upgradeLevel?: number
  },
): Promise<string[]> {
  const unlocked: string[] = []
  const db = supabaseAdmin()

  const tryUnlock = async (id: string) => {
    const result = await unlockAchievement(wallet, id)
    if (result) unlocked.push(result)
  }

  // Action-based achievements
  if (context.action === 'claim') await tryUnlock('first_claim')
  if (context.action === 'harvest_crop') await tryUnlock('first_harvest')
  if (context.action === 'buy_animal') await tryUnlock('first_animal')
  if (context.action === 'fish') await tryUnlock('first_fish')
  if (context.action === 'trade_accept') await tryUnlock('first_trade')
  if (context.action === 'alliance_join') await tryUnlock('alliance_join')
  if (context.action === 'referral') await tryUnlock('referral_sent')

  // Count-based — harvest_10, harvest_50
  if (context.action === 'harvest_crop' && context.cropHarvestCount !== undefined) {
    const { count } = await db
      .from('plot_events')
      .select('*', { count: 'exact', head: true })
      .eq('wallet', wallet)
      .eq('event_type', 'harvest_crop')
    const total = (count ?? 0) + 1
    if (total >= 10)  await tryUnlock('harvest_10')
    if (total >= 50)  await tryUnlock('harvest_50')
  }

  // Animal count
  if (context.animalCount !== undefined && context.animalCount >= 5) {
    await tryUnlock('five_animals')
  }

  // Plot tier
  if (context.plotTier === 'gold' || context.plotTier === 'diamond') {
    await tryUnlock('gold_plot')
  }

  // Upgrade level
  if (context.upgradeLevel !== undefined && context.upgradeLevel >= 4) {
    await tryUnlock('level_4')
  }

  return unlocked
}
