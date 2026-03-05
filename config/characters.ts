// ── Character definitions ──────────────────────────────────────────────────────
// All characters share the same row layout (same asset pack):
//   Row 0: face West   (not used — left mirrors right via flipX)
//   Row 1: face East   / right
//   Row 2: face North  / up
//   Row 3: face South  / down
//
// Frame index = row * cols + col

export interface CharacterDef {
  id:          string
  label:       string
  category:    'farmer' | 'townsperson' | 'knight' | 'goblin' | 'angel'
  file:        string   // public path
  frameWidth:  number
  frameHeight: number
  sheetCols:   number   // frames per row
  scale:       number   // world display scale (target ~96px tall on screen)
  // Animation frame ranges (start/end inclusive)
  downStart:   number
  downEnd:     number
  upStart:     number
  upEnd:       number
  rightStart:  number
  rightEnd:    number
}

// Helper: compute walk-frame ranges from column count
function rowRange(cols: number) {
  return {
    rightStart: cols * 1,
    rightEnd:   cols * 1 + cols - 1,
    upStart:    cols * 2,
    upEnd:      cols * 2 + cols - 1,
    downStart:  cols * 3,
    downEnd:    cols * 3 + cols - 1,
  }
}

export const CHARACTER_DEFS: CharacterDef[] = [
  // ── Default (existing player sprite) ────────────────────────────────────────
  {
    id: 'player', label: 'Villager', category: 'farmer',
    file: '/assets/player.png',
    frameWidth: 32, frameHeight: 32, sheetCols: 6, scale: 3,
    ...rowRange(6),
  },

  // ── Farmers (64×64, 6 cols) ──────────────────────────────────────────────────
  {
    id: 'farmer-bob', label: 'Farmer Bob', category: 'farmer',
    file: '/assets/characters/Farmer_Bob.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 6, scale: 1.5,
    ...rowRange(6),
  },
  {
    id: 'farmer-buba', label: 'Farmer Buba', category: 'farmer',
    file: '/assets/characters/Farmer_Buba.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 6, scale: 1.5,
    ...rowRange(6),
  },

  // ── Townspeople ──────────────────────────────────────────────────────────────
  {
    id: 'fisherman', label: 'Fisherman Fin', category: 'townsperson',
    file: '/assets/characters/Fisherman_Fin.png',
    // 576×832 = 9 cols × 13 rows @ 64×64
    frameWidth: 64, frameHeight: 64, sheetCols: 9, scale: 1.5,
    ...rowRange(9),
  },
  {
    id: 'lumberjack', label: 'Lumberjack Jack', category: 'townsperson',
    file: '/assets/characters/Lumberjack_Jack.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 6, scale: 1.5,
    ...rowRange(6),
  },
  {
    id: 'miner', label: 'Miner Mike', category: 'townsperson',
    file: '/assets/characters/Miner_Mike.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 6, scale: 1.5,
    ...rowRange(6),
  },
  {
    id: 'bartender-m', label: 'Bartender Bruno', category: 'townsperson',
    file: '/assets/characters/Bartender_Bruno.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 6, scale: 1.5,
    ...rowRange(6),
  },
  {
    id: 'chef', label: 'Chef Chloe', category: 'townsperson',
    file: '/assets/characters/Chef_Chloe.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 6, scale: 1.5,
    ...rowRange(6),
  },
  {
    id: 'bartender-f', label: 'Bartender Katy', category: 'townsperson',
    file: '/assets/characters/Bartender_Katy.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 6, scale: 1.5,
    ...rowRange(6),
  },

  // ── Knights (48×48, 6 cols) ──────────────────────────────────────────────────
  {
    id: 'archer', label: 'Archer', category: 'knight',
    file: '/assets/characters/Archer.png',
    frameWidth: 48, frameHeight: 48, sheetCols: 6, scale: 2,
    ...rowRange(6),
  },
  {
    id: 'swordman', label: 'Swordsman', category: 'knight',
    file: '/assets/characters/Swordman.png',
    frameWidth: 48, frameHeight: 48, sheetCols: 6, scale: 2,
    ...rowRange(6),
  },
  {
    id: 'templar', label: 'Templar', category: 'knight',
    file: '/assets/characters/Templar.png',
    frameWidth: 48, frameHeight: 48, sheetCols: 6, scale: 2,
    ...rowRange(6),
  },

  // ── Goblins (48×48, 6 cols) ──────────────────────────────────────────────────
  {
    id: 'goblin-archer', label: 'Goblin Archer', category: 'goblin',
    file: '/assets/characters/Goblin_Archer.png',
    frameWidth: 48, frameHeight: 48, sheetCols: 6, scale: 2,
    ...rowRange(6),
  },
  {
    id: 'goblin-thief', label: 'Goblin Thief', category: 'goblin',
    file: '/assets/characters/Goblin_Thief.png',
    frameWidth: 48, frameHeight: 48, sheetCols: 6, scale: 2,
    ...rowRange(6),
  },

  // ── Angels (64×64, 8 cols) ───────────────────────────────────────────────────
  {
    id: 'angel-1', label: 'Angel', category: 'angel',
    file: '/assets/characters/Angel_1.png',
    // 512×832 = 8 cols × 13 rows @ 64×64
    frameWidth: 64, frameHeight: 64, sheetCols: 8, scale: 1.5,
    ...rowRange(8),
  },
  {
    id: 'angel-2', label: 'Seraph', category: 'angel',
    file: '/assets/characters/Angel_2.png',
    frameWidth: 64, frameHeight: 64, sheetCols: 8, scale: 1.5,
    ...rowRange(8),
  },
]

// Pick a random character (excluding default 'player')
export function randomCharacter(): CharacterDef {
  const pool = CHARACTER_DEFS.filter(c => c.id !== 'player')
  return pool[Math.floor(Math.random() * pool.length)]
}

// Saved character per-browser (not per-wallet for simplicity)
const LS_KEY = 'farm:char'

export function getSavedCharacter(): CharacterDef {
  if (typeof window === 'undefined') return CHARACTER_DEFS[0]
  const saved = window.localStorage.getItem(LS_KEY)
  const found = saved ? CHARACTER_DEFS.find(c => c.id === saved) : null
  if (found) return found
  // First visit — assign random, persist
  const rnd = randomCharacter()
  window.localStorage.setItem(LS_KEY, rnd.id)
  return rnd
}

export function saveCharacter(id: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(LS_KEY, id)
}

// ── Player name ─────────────────────────────────────────────────────────────
const NAME_KEY = 'farm:playerName'

export function getPlayerName(): string {
  if (typeof window === 'undefined') return 'Farmer'
  return window.localStorage.getItem(NAME_KEY) ?? 'Farmer'
}

export function savePlayerName(name: string) {
  if (typeof window !== 'undefined') {
    const trimmed = name.trim().slice(0, 16) || 'Farmer'
    window.localStorage.setItem(NAME_KEY, trimmed)
  }
}
