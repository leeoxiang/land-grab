export const PLOT_TIERS = {
  bronze:   { count: 50, claimCost: 1, speed: 1.0, cropSlots: 4,  animalSlots: 1, color: 0xcd7f32, label: 'Bronze'   },
  silver:   { count: 30, claimCost: 1, speed: 1.5, cropSlots: 6,  animalSlots: 2, color: 0xc0c0c0, label: 'Silver'   },
  gold:     { count: 15, claimCost: 1, speed: 2.0, cropSlots: 8,  animalSlots: 3, color: 0xffd700, label: 'Gold'     },
  diamond:  { count: 5,  claimCost: 1, speed: 3.0, cropSlots: 10, animalSlots: 5, color: 0x00bfff, label: 'Diamond' },
} as const

export type PlotTier = keyof typeof PLOT_TIERS

export const CROPS = {
  wheat:       { name: 'Wheat',       growMs: 1 * 60 * 1000,   seedCost: 1, sellPrice: 2,  color: '#f5c518', emoji: '🌾' },
  carrots:     { name: 'Carrots',     growMs: 2 * 60 * 1000,   seedCost: 1, sellPrice: 3,  color: '#ff7518', emoji: '🥕' },
  corn:        { name: 'Corn',        growMs: 3 * 60 * 1000,   seedCost: 1, sellPrice: 5,  color: '#ffe135', emoji: '🌽' },
  tomatoes:    { name: 'Tomatoes',    growMs: 5 * 60 * 1000,   seedCost: 1, sellPrice: 8,  color: '#ff3d00', emoji: '🍅' },
  pumpkin:     { name: 'Pumpkin',     growMs: 8 * 60 * 1000,   seedCost: 1, sellPrice: 12, color: '#ff7518', emoji: '🎃' },
  sunflower:   { name: 'Sunflower',   growMs: 10 * 60 * 1000,  seedCost: 1, sellPrice: 20, color: '#ffd700', emoji: '🌻' },
  magicHerbs:  { name: 'Magic Herbs', growMs: 15 * 60 * 1000,  seedCost: 1, sellPrice: 50, color: '#9b59b6', emoji: '🌿' },
} as const

export const TREES = {
  apple:  { name: 'Apple Tree',  growMs: 5 * 60 * 1000,  cost: 1, harvestMs: 3 * 60 * 1000, yield: 10, color: '#2ecc71', emoji: '🍎' },
  oak:    { name: 'Oak Tree',    growMs: 10 * 60 * 1000, cost: 1, harvestMs: 5 * 60 * 1000, yield: 20, color: '#27ae60', emoji: '🌳' },
  mango:  { name: 'Mango Tree',  growMs: 15 * 60 * 1000, cost: 1, harvestMs: 8 * 60 * 1000, yield: 40, color: '#f39c12', emoji: '🥭' },
} as const

export const ANIMALS = {
  chicken: { name: 'Chicken', cost: 1, produces: 'eggs',     harvestMs: 2 * 60 * 1000,  yield: 5,  emoji: '🐔' },
  cow:     { name: 'Cow',     cost: 1, produces: 'milk',     harvestMs: 5 * 60 * 1000,  yield: 10, emoji: '🐄' },
  sheep:   { name: 'Sheep',   cost: 1, produces: 'wool',     harvestMs: 8 * 60 * 1000,  yield: 15, emoji: '🐑' },
  pig:     { name: 'Pig',     cost: 1, produces: 'truffles', harvestMs: 12 * 60 * 1000, yield: 25, emoji: '🐷' },
  beehive: { name: 'Bee Hive',cost: 1, produces: 'honey',    harvestMs: 10 * 60 * 1000, yield: 20, emoji: '🐝' },
} as const

// Fishing — available on plots with hasPond:true in their sidecar metadata
export const FISH = {
  minnow:    { name: 'Minnow',     rarity: 0.40, sellPrice: 15,   emoji: '🐟' },
  perch:     { name: 'Perch',      rarity: 0.25, sellPrice: 35,   emoji: '🐠' },
  bass:      { name: 'Bass',       rarity: 0.18, sellPrice: 80,   emoji: '🐡' },
  salmon:    { name: 'Salmon',     rarity: 0.10, sellPrice: 200,  emoji: '🐟' },
  pike:      { name: 'Pike',       rarity: 0.05, sellPrice: 450,  emoji: '🦈' },
  legendary: { name: 'Legendary',  rarity: 0.02, sellPrice: 1500, emoji: '✨' },
} as const

export type FishType = keyof typeof FISH

// Fishing cooldown per plot: 20 minutes
export const FISH_COOLDOWN_MS = 20 * 60 * 1000

export const FARMERS = {
  apprentice: { name: 'Apprentice', cost: 1, speed: 1.0, cropSlots: 2,  animalSlots: 0,  emoji: '👨‍🌾' },
  journeyman: { name: 'Journeyman', cost: 1, speed: 1.5, cropSlots: 4,  animalSlots: 1,  emoji: '🧑‍🌾' },
  master:     { name: 'Master',     cost: 1, speed: 2.0, cropSlots: 99, animalSlots: 99, emoji: '👴' },
} as const

export type CropType    = keyof typeof CROPS
export type TreeType    = keyof typeof TREES
export type AnimalType  = keyof typeof ANIMALS
export type FarmerType  = keyof typeof FARMERS

// Base harvest cycle for a speed-1.0 farmer. Actual cycle = BASE / farmer.speed.
// Apprentice: 5 min · Journeyman: ~3.3 min · Master: 2.5 min
export const FARMER_HARVEST_BASE_MS = 5 * 60 * 1000

// ── Goblin defenders ──────────────────────────────────────────────────────────
// Hired to protect plots from raiding. Higher tiers reduce steal success.
export const GOBLINS = {
  scout:  { name: 'Goblin Scout',   defenseBonus: 20, costPerHour: 1, emoji: '👺' },
  guard:  { name: 'Goblin Guard',   defenseBonus: 40, costPerHour: 1, emoji: '🗡️' },
  warlord:{ name: 'Goblin Warlord', defenseBonus: 65, costPerHour: 1, emoji: '⚔️' },
} as const

export type GoblinTier = keyof typeof GOBLINS

// ── Steal mechanic ─────────────────────────────────────────────────────────────
export const STEAL_CONFIG = {
  cost:            1,    // USDC to attempt raid
  failCost:        1,    // USDC lost on failure
  baseSuccessRate: 60,   // % chance undefended
  marchMs:         35 * 60 * 1000, // 35 min for goblins to march and complete the raid
  cooldownMs:      60 * 60 * 1000, // 1 hr cooldown between raids
  lootPct:         0.15, // steal up to 15% of target's harvestable inventory
} as const

// ── Tokenomics ────────────────────────────────────────────────────────────────
// 5% of every USDC transaction is burned (deflationary).
// 5% goes to the community treasury (distributed weekly to top farmers).
// 90% reaches the intended recipient (treasury / seller / pool).
export const TOKENOMICS = {
  burnRate:        0.05,  // 5% of all purchases burned
  taxRate:         0.05,  // 5% community treasury tax
  claimTax:        0.10,  // 10% of claim cost → treasury
  harvestTax:      0.05,  // 5% of sold harvest value → treasury
  stealRewardPct:  0.80,  // 80% of stolen goods to attacker; 20% burned
} as const

// ── Plot upgrades ──────────────────────────────────────────────────────────────
// Each level boosts harvest yield. Cost is paid in USDC tokens.
export const UPGRADES: Record<number, { multiplier: number; cost: number; label: string }> = {
  2: { multiplier: 1.25, cost: 5,  label: 'Level 2' },
  3: { multiplier: 1.5,  cost: 15, label: 'Level 3' },
  4: { multiplier: 2.0,  cost: 40, label: 'Level 4' },
}
export const MAX_UPGRADE_LEVEL = 4

export const MARKETPLACE_FEE = 0.025 // 2.5%
export const WORLD_COLS = 10
export const WORLD_ROWS = 10
export const PLOT_SIZE  = 500 // pixels — one plot fills the screen
export const PLOT_GAP   = 70  // path width between plots

// ── Rarity tiers (applied to items in inventory display) ──────────────────────
export const RARITY = {
  common:    { label: 'Common',    color: '#aaaaaa', bg: '#1a1a1a' },
  uncommon:  { label: 'Uncommon',  color: '#2ecc71', bg: '#0a1f10' },
  rare:      { label: 'Rare',      color: '#3498db', bg: '#0a1020' },
  epic:      { label: 'Epic',      color: '#9b59b6', bg: '#150a20' },
  legendary: { label: 'Legendary', color: '#ffd700', bg: '#1f1a00' },
} as const
export type RarityLevel = keyof typeof RARITY

// Map item types to rarity
export const ITEM_RARITY: Record<string, RarityLevel> = {
  wheat:     'common',
  carrots:   'common',
  corn:      'uncommon',
  tomatoes:  'uncommon',
  pumpkin:   'rare',
  sunflower: 'rare',
  magicHerbs:'epic',
  eggs:      'common',
  milk:      'uncommon',
  wool:      'uncommon',
  truffles:  'epic',
  honey:     'rare',
  minnow:    'common',
  perch:     'uncommon',
  bass:      'rare',
  salmon:    'rare',
  pike:      'epic',
  legendary: 'legendary',
}

// ── Achievements ──────────────────────────────────────────────────────────────
export const ACHIEVEMENT_DEFS: Record<string, { label: string; desc: string; icon: string }> = {
  first_claim:     { label: 'Land Owner',     desc: 'Claim your first plot',         icon: '🏠' },
  first_harvest:   { label: 'First Harvest',  desc: 'Harvest your first crop',       icon: '🌾' },
  first_animal:    { label: 'Animal Keeper',  desc: 'Buy your first animal',         icon: '🐄' },
  first_fish:      { label: 'Fisherman',      desc: 'Catch your first fish',         icon: '🎣' },
  first_trade:     { label: 'Trader',         desc: 'Complete your first trade',     icon: '🤝' },
  harvest_10:      { label: 'Busy Farmer',    desc: 'Harvest 10 crops',              icon: '🌽' },
  harvest_50:      { label: 'Master Farmer',  desc: 'Harvest 50 crops',              icon: '🏆' },
  five_animals:    { label: 'Ranch Hand',     desc: 'Own 5 animals at once',        icon: '🐑' },
  top_10:          { label: 'Rising Star',    desc: 'Reach top 10 on leaderboard',  icon: '⭐' },
  top_3:           { label: 'Elite Farmer',   desc: 'Reach top 3 on leaderboard',   icon: '👑' },
  gold_plot:       { label: 'Gold Rush',      desc: 'Own a Gold or Diamond plot',   icon: '💛' },
  level_4:         { label: 'Max Power',      desc: 'Upgrade a plot to Level 4',    icon: '⬆️' },
  referral_sent:   { label: 'Evangelist',     desc: 'Refer a friend to the game',   icon: '📢' },
  alliance_join:   { label: 'Allied',         desc: 'Join or create an alliance',   icon: '⚔️' },
}

// ── Golden Hour schedule ──────────────────────────────────────────────────────
// Fires every 6 hours (UTC 0, 6, 12, 18). Lasts 1 hour. +20% yield bonus.
export const GOLDEN_HOUR_INTERVAL_MS  = 6 * 60 * 60 * 1000
export const GOLDEN_HOUR_DURATION_MS  = 60 * 60 * 1000
export const GOLDEN_HOUR_YIELD_BONUS  = 0.20  // 20% bonus

// ── Alliance yield bonus ──────────────────────────────────────────────────────
export const ALLIANCE_YIELD_BONUS = 0.05  // 5% bonus for alliance members
export const ALLIANCE_MAX_MEMBERS = 5
