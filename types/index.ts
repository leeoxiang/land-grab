import type { PlotTier, CropType, TreeType, AnimalType, FarmerType } from '@/config/game'

export interface Player {
  wallet: string
  balance: number // USDC balance in lamports
  created_at: string
}

export interface Plot {
  id:            number
  tier:          PlotTier
  col:           number
  row:           number
  owner_wallet:  string | null
  locked_tokens: number
  claimed_at:    string | null
  last_fish_at:  string | null
  custom_name?:  string | null
  upgrade_level?: number
  farmer_count?: number  // injected by /api/plots bulk endpoint
}

export interface Crop {
  id: string
  plot_id: number
  slot: number
  crop_type: CropType
  planted_at: string
  harvest_at: string
  harvested: boolean
}

export interface Tree {
  id: string
  plot_id: number
  tree_type: TreeType
  planted_at: string
  ready_at: string       // when fully grown
  last_harvest: string | null
  next_harvest: string | null
}

export interface Animal {
  id: string
  plot_id: number
  animal_type: AnimalType
  purchased_at: string
  last_harvest: string | null
  next_harvest: string
}

export interface Farmer {
  id: string
  plot_id: number
  farmer_type: FarmerType
  purchased_at: string
  last_harvest_at?: string | null
}

export interface InventoryItem {
  id: string
  player_wallet: string
  item_type: string
  quantity: number
}

export interface Goblin {
  id:         string
  plot_id:    number
  tier:       'scout' | 'guard' | 'warlord'
  hired_at:   string
  expires_at: string
}

export interface StealAttempt {
  id:            string
  attacker:      string
  target_plot:   number
  attempted_at:  string
  next_steal_at: string
  success:       boolean
  loot_type:     string | null
  loot_qty:      number | null
}

export interface MarketOrder {
  id: string
  player_wallet: string
  item_type: string
  quantity: number
  price_per_unit: number
  order_type: 'buy' | 'sell'
  status: 'open' | 'filled' | 'cancelled'
  created_at: string
}

export interface PlotFull extends Plot {
  crops: Crop[]
  trees: Tree[]
  animals: Animal[]
  farmers: Farmer[]
}
