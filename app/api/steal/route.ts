/**
 * POST /api/steal
 *
 * Attempt to raid another player's plot and steal from their inventory.
 *
 * Body: { targetPlotId: number, wallet: string }
 *
 * Flow:
 *  1. Verify attacker ≠ plot owner.
 *  2. Check attacker steal cooldown (steal_attempts table).
 *  3. Deduct STEAL_CONFIG.cost from attacker balance.
 *  4. Calculate success rate: base 40% − total goblin defenseBonus active on target plot.
 *  5. On success: steal up to 15% of one random inventory item from target.
 *     Transfer TOKENOMICS.stealRewardPct of loot to attacker; burn the rest.
 *  6. Record attempt and return result.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { STEAL_CONFIG, GOBLINS, TOKENOMICS } from '@/config/game'

export async function POST(req: Request) {
  const { targetPlotId, wallet } = await req.json()
  if (!targetPlotId || !wallet) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const db  = supabaseAdmin()
  const now = new Date()

  // 1. Load target plot
  const { data: plot } = await db.from('plots').select('*').eq('id', targetPlotId).single()
  if (!plot)             return NextResponse.json({ error: 'Plot not found' }, { status: 404 })
  if (!plot.owner_wallet) return NextResponse.json({ error: 'Plot is unclaimed' }, { status: 400 })
  if (plot.owner_wallet === wallet) return NextResponse.json({ error: 'Cannot raid your own plot' }, { status: 400 })

  // 2. Check steal cooldown for this attacker
  const { data: lastAttempt } = await db
    .from('steal_attempts')
    .select('next_steal_at')
    .eq('attacker', wallet)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastAttempt && new Date(lastAttempt.next_steal_at) > now) {
    const msLeft = new Date(lastAttempt.next_steal_at).getTime() - now.getTime()
    return NextResponse.json({ error: `Steal on cooldown — ${Math.ceil(msLeft / 60000)} minutes left` }, { status: 400 })
  }

  // 3. Check attacker balance
  const { data: attacker } = await db.from('players').select('balance').eq('wallet', wallet).maybeSingle()
  if (!attacker || attacker.balance < STEAL_CONFIG.cost) {
    return NextResponse.json({ error: `Need ${STEAL_CONFIG.cost} USDC to raid` }, { status: 400 })
  }

  // 4. Calculate success rate: base − active goblin defense
  const { data: goblins } = await db
    .from('goblins')
    .select('tier')
    .eq('plot_id', targetPlotId)
    .gt('expires_at', now.toISOString())

  const totalDefense = (goblins ?? []).reduce((sum, g) => {
    const cfg = GOBLINS[g.tier as keyof typeof GOBLINS]
    return sum + (cfg?.defenseBonus ?? 0)
  }, 0)

  const successRate = Math.max(5, STEAL_CONFIG.baseSuccessRate - totalDefense) // min 5%
  const success     = Math.random() * 100 < successRate

  const nextStealAt = new Date(now.getTime() + STEAL_CONFIG.cooldownMs)

  if (!success) {
    // Deduct fail cost
    await db.from('players').update({ balance: attacker.balance - STEAL_CONFIG.failCost }).eq('wallet', wallet)
    await db.from('steal_attempts').insert({
      attacker:     wallet,
      target_plot:  targetPlotId,
      attempted_at: now.toISOString(),
      next_steal_at: nextStealAt.toISOString(),
      success:      false,
    })
    return NextResponse.json({ success: false, msg: 'Raid failed — defenders repelled you' })
  }

  // 5. Pick a random item from target's inventory
  const { data: inventory } = await db
    .from('inventory')
    .select('*')
    .eq('player_wallet', plot.owner_wallet)
    .gt('quantity', 0)

  if (!inventory || inventory.length === 0) {
    // Still charge the cost but nothing to steal
    await db.from('players').update({ balance: attacker.balance - STEAL_CONFIG.cost }).eq('wallet', wallet)
    await db.from('steal_attempts').insert({
      attacker: wallet,
      target_plot:  targetPlotId,
      attempted_at: now.toISOString(),
      next_steal_at: nextStealAt.toISOString(),
      success:      false,
      loot_type:    null,
      loot_qty:     0,
    })
    return NextResponse.json({ success: true, msg: 'Raid succeeded but target inventory was empty' })
  }

  const target    = inventory[Math.floor(Math.random() * inventory.length)]
  const rawQty    = Math.max(1, Math.floor(target.quantity * STEAL_CONFIG.lootPct))
  const stolen    = Math.floor(rawQty * TOKENOMICS.stealRewardPct) // attacker gets 80%

  // Deduct from target
  await db.rpc('decrement_inventory', {
    p_wallet:    plot.owner_wallet,
    p_item_type: target.item_type,
    p_qty:       rawQty,
  })

  // Add to attacker
  await db.rpc('increment_inventory', {
    p_wallet:    wallet,
    p_item_type: target.item_type,
    p_qty:       stolen,
  })

  // Deduct raid cost from attacker
  await db.from('players').update({ balance: attacker.balance - STEAL_CONFIG.cost }).eq('wallet', wallet)

  // Record attempt
  await db.from('steal_attempts').insert({
    attacker: wallet,
    target_plot:  targetPlotId,
    attempted_at: now.toISOString(),
    next_steal_at: nextStealAt.toISOString(),
    success:      true,
    loot_type:    target.item_type,
    loot_qty:     stolen,
  })

  return NextResponse.json({
    success:  true,
    loot:     target.item_type,
    qty:      stolen,
    burned:   rawQty - stolen,
  })
}
