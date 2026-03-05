'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Canvas constants ──────────────────────────────────────────────────────────
const CANVAS_SIZE = 1600
const TILE  = 64          // 4× base tile (16px → 64px)
const TILES = 25          // CANVAS_SIZE / TILE
const FARM  = 192         // farmland.png: 48px source → 3 tiles = 192px
const S     = CANVAS_SIZE

// Tree display sizes (2× their source dimensions)
const OAK_W = 128,  OAK_H  = 160   // oak_tree.png  64×80
const BIG_W = 128,  BIG_H  = 160   // big oak/spruce frame 64×80
const BIR_W = 192,  BIR_H  = 160   // big_birch.png full 96×80 drawn as one unit @ 2×

// Building display sizes (2× source)
const BARN_W    = 256, BARN_H    = 288  // 128×144
const HOUSE_W   = 192, HOUSE_H   = 256  // 96×128
const WINDM_W   = 256, WINDM_H   = 224  // 128×112
const SILO_W    = 96,  SILO_H    = 160  // 48×80
const WELL_W    = 64,  WELL_H    = 96   // 32×48
const CROW_SZ   = 64                    // scarecrow 32×32 → 64×64

const ANIMAL_SZ = 128                   // animals: draw one 32×32 frame → 128×128

// ─── Types ────────────────────────────────────────────────────────────────────
type Layout    = 'farm' | 'orchard' | 'crossroads' | 'forest_edge' | 'dual_field' | 'village' | 'windmill_farm' | 'pond'
type Tier      = 'bronze' | 'silver' | 'gold' | 'diamond'
type AnimalType = 'chicken' | 'cow' | 'pig' | 'sheep'

export type PlotMeta = {
  plotNumber:     number
  filename:       string
  tier:           Tier
  score:          number
  layout:         Layout
  treeCount:      number
  farmlandBlocks: number
  animals:        AnimalType[]
  hasBeehive:     boolean
  hasPath:        boolean
  hasWindmill:    boolean
  hasPond:        boolean
}

type Sprites = {
  grass:    HTMLImageElement
  path:     HTMLImageElement
  farmland: HTMLImageElement
  tree:     HTMLImageElement
  bigOak:   HTMLImageElement
  bigBirch: HTMLImageElement
  bigSpruce:HTMLImageElement
  chicken:  HTMLImageElement
  cow:      HTMLImageElement
  pig:      HTMLImageElement
  sheep:    HTMLImageElement
  beehive:  HTMLImageElement
  flowers:  HTMLImageElement
  hay:      HTMLImageElement
  fence:    HTMLImageElement
  barn:     HTMLImageElement
  house:    HTMLImageElement
  windmill: HTMLImageElement
  silo:     HTMLImageElement
  well:     HTMLImageElement
  scarecrow:HTMLImageElement
  water:    HTMLImageElement
}

// ─── Config ───────────────────────────────────────────────────────────────────
const TIER_COLORS: Record<Tier, string> = {
  bronze: '#cd7f32', silver: '#b0b0c8', gold: '#ffd700', diamond: '#00bfff',
}
const TIER_SHADOW: Record<Tier, string> = {
  bronze: '#7a4910', silver: '#606070', gold: '#8b7000', diamond: '#005580',
}
const ANIMAL_EMOJI: Record<AnimalType, string> = {
  chicken: '🐔', cow: '🐄', pig: '🐷', sheep: '🐑',
}
const LAYOUT_BONUS: Record<Layout, number> = {
  farm: 8, village: 12, crossroads: 12, dual_field: 13,
  orchard: 14, forest_edge: 18, windmill_farm: 20, pond: 17,
}
const TARGET: Record<Tier, number> = { bronze: 50, silver: 30, gold: 15, diamond: 5 }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
function choose<T>(arr: readonly T[]): T { return arr[rand(0, arr.length - 1)] }

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload  = () => res(img)
    img.onerror = () => rej(new Error(`Cannot load ${src}`))
    img.src = src
  })
}

async function loadAllSprites(): Promise<Sprites> {
  const [
    grass, path, farmland, tree,
    bigOak, bigBirch, bigSpruce,
    chicken, cow, pig, sheep, beehive,
    flowers, hay, fence, barn, house,
    windmill, silo, well, scarecrow, water,
  ] = await Promise.all([
    loadImg('/assets/grass.png'),
    loadImg('/assets/path.png'),
    loadImg('/assets/farmland.png'),
    loadImg('/assets/oak_tree.png'),
    loadImg('/assets/trees/big_oak.png'),
    loadImg('/assets/trees/big_birch.png'),
    loadImg('/assets/trees/big_spruce.png'),
    loadImg('/assets/chicken.png'),
    loadImg('/assets/cow.png'),
    loadImg('/assets/pig.png'),
    loadImg('/assets/sheep.png'),
    loadImg('/assets/beehive.png'),
    loadImg('/assets/decorations/Flowers.png'),
    loadImg('/assets/decorations/Hay_Bales.png'),
    loadImg('/assets/decorations/Fences.png'),
    loadImg('/assets/buildings/Barn.png'),
    loadImg('/assets/buildings/House.png'),
    loadImg('/assets/buildings/Windmill.png'),
    loadImg('/assets/buildings/Silo.png'),
    loadImg('/assets/decorations/Well.png'),
    loadImg('/assets/decorations/Scarecrows.png'),
    loadImg('/assets/tiles/water.png'),
  ])
  return {
    grass, path, farmland, tree,
    bigOak, bigBirch, bigSpruce,
    chicken, cow, pig, sheep, beehive,
    flowers, hay, fence, barn, house,
    windmill, silo, well, scarecrow, water,
  }
}

// ─── Score → Tier ─────────────────────────────────────────────────────────────
function scoreToTier(score: number): Tier {
  if (score >= 95) return 'diamond'
  if (score >= 68) return 'gold'
  if (score >= 44) return 'silver'
  return 'bronze'
}

// ─── Main draw function ────────────────────────────────────────────────────────
function drawPlot(canvas: HTMLCanvasElement, sprites: Sprites): Omit<PlotMeta, 'plotNumber'|'filename'> {
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, S, S)

  const stats = {
    treeCount: 0, farmlandBlocks: 0,
    animals: [] as AnimalType[],
    hasBeehive: false, hasPath: false, hasWindmill: false, hasPond: false,
  }

  // ── Drawing helpers ────────────────────────────────────────────────────────

  // Classic oak (oak_tree.png, single image 64×80)
  const addTree = (px: number, py: number) => {
    ctx.drawImage(sprites.tree,
      clamp(Math.round(px), -16, S - OAK_W + 16),
      clamp(Math.round(py), -16, S - OAK_H + 16),
      OAK_W, OAK_H,
    )
    stats.treeCount++
  }

  // Big oak/spruce (192×80, 3 frames × 64px)
  const addBigOak = (px: number, py: number) => {
    const frame = rand(0, 2)
    ctx.drawImage(sprites.bigOak, frame * 64, 0, 64, 80,
      clamp(Math.round(px), -16, S - BIG_W + 16),
      clamp(Math.round(py), -16, S - BIG_H + 16),
      BIG_W, BIG_H,
    )
    stats.treeCount++
  }

  // Big birch (96×80, drawn as one full image — the full 96px is one birch canopy)
  const addBirch = (px: number, py: number) => {
    ctx.drawImage(sprites.bigBirch, 0, 0, 96, 80,
      clamp(Math.round(px), -16, S - BIR_W + 16),
      clamp(Math.round(py), -16, S - BIR_H + 16),
      BIR_W, BIR_H,
    )
    stats.treeCount++
  }

  // Big spruce (192×80, 3 frames × 64px)
  const addSpruce = (px: number, py: number) => {
    const frame = rand(0, 2)
    ctx.drawImage(sprites.bigSpruce, frame * 64, 0, 64, 80,
      clamp(Math.round(px), -16, S - BIG_W + 16),
      clamp(Math.round(py), -16, S - BIG_H + 16),
      BIG_W, BIG_H,
    )
    stats.treeCount++
  }

  // Pick any big tree variety
  const addAnyTree = (px: number, py: number) => {
    const r = Math.random()
    if      (r < 0.30) addTree(px, py)
    else if (r < 0.55) addBigOak(px, py)
    else if (r < 0.78) addBirch(px, py)
    else               addSpruce(px, py)
  }

  const addFarm = (tileX: number, tileY: number, cols: number, rows: number) => {
    const bx = clamp(Math.round(tileX) * TILE, 0, S - FARM)
    const by = clamp(Math.round(tileY) * TILE, 0, S - FARM)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const fx = Math.min(bx + c * FARM, S - FARM)
        const fy = Math.min(by + r * FARM, S - FARM)
        ctx.drawImage(sprites.farmland, fx, fy, FARM, FARM)
        stats.farmlandBlocks++
      }
    }
    // Hay bale near farmland
    if (Math.random() < 0.65) {
      const frame = rand(0, 2)
      const hx = clamp(bx + rand(-TILE, cols * FARM), 0, S - TILE * 2)
      const hy = clamp(by + rand(0, rows * FARM - TILE), 0, S - TILE * 2)
      ctx.drawImage(sprites.hay, frame * 16, 0, 16, 16, hx, hy, TILE * 2, TILE * 2)
    }
    // Scarecrow near farmland
    if (Math.random() < 0.35) {
      const frame = rand(0, 4)
      const sx = clamp(bx + rand(0, cols * FARM + TILE), 0, S - CROW_SZ)
      const sy = clamp(by - CROW_SZ, 0, S - CROW_SZ)
      ctx.drawImage(sprites.scarecrow, frame * 32, 0, 32, 32, sx, sy, CROW_SZ, CROW_SZ)
    }
  }

  const addHPath = (row: number) => {
    const r = clamp(row, 0, TILES - 2)
    for (let c = 0; c < TILES; c++) {
      ctx.drawImage(sprites.path, c * TILE, r * TILE,       TILE, TILE)
      ctx.drawImage(sprites.path, c * TILE, (r + 1) * TILE, TILE, TILE)
    }
    stats.hasPath = true
  }

  const addVPath = (col: number) => {
    const c = clamp(col, 0, TILES - 2)
    for (let r = 0; r < TILES; r++) {
      ctx.drawImage(sprites.path, c * TILE,       r * TILE, TILE, TILE)
      ctx.drawImage(sprites.path, (c + 1) * TILE, r * TILE, TILE, TILE)
    }
    stats.hasPath = true
  }

  const addEdgeTrees = (edge: 'top'|'bottom'|'left'|'right', count: number) => {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5 + (Math.random() - 0.5) * 0.5) / count
      const j = rand(-24, 24)
      let px: number, py: number
      if      (edge === 'top')    { px = t * S + j;            py = rand(-12, 20) }
      else if (edge === 'bottom') { px = t * S + j;            py = S - BIG_H - rand(0, 24) }
      else if (edge === 'left')   { px = rand(-12, 20);        py = t * S + j }
      else                        { px = S - BIG_W - rand(0, 24); py = t * S + j }
      addAnyTree(px, py)
    }
  }

  const addTreesIn = (n: number, x0: number, y0: number, x1: number, y1: number) => {
    for (let i = 0; i < n; i++)
      addAnyTree(rand(x0, Math.max(x0, x1 - BIG_W)), rand(y0, Math.max(y0, y1 - BIG_H)))
  }

  const addFenceLine = (x: number, y: number, count: number, vertical = false) => {
    for (let i = 0; i < count; i++) {
      const dx = vertical ? 0 : i * TILE
      const dy = vertical ? i * TILE : 0
      ctx.drawImage(sprites.fence, 0, 0, 16, 16, x + dx, y + dy, TILE, TILE)
    }
  }

  const addBarn = (x: number, y: number) => {
    ctx.drawImage(sprites.barn, 0, 0, 128, 144,
      clamp(x, 0, S - BARN_W), clamp(y, 0, S - BARN_H),
      BARN_W, BARN_H,
    )
  }
  const addHouse = (x: number, y: number) => {
    ctx.drawImage(sprites.house, 0, 0, 96, 128,
      clamp(x, 0, S - HOUSE_W), clamp(y, 0, S - HOUSE_H),
      HOUSE_W, HOUSE_H,
    )
  }

  // Oval water pond
  const drawPond = (cx: number, cy: number, halfW: number, halfH: number) => {
    for (let ty = -halfH; ty <= halfH; ty++) {
      for (let tx = -halfW; tx <= halfW; tx++) {
        if ((tx * tx) / (halfW * halfW + 0.5) + (ty * ty) / (halfH * halfH + 0.5) <= 1) {
          const wx = Math.round(cx + tx * TILE - TILE / 2)
          const wy = Math.round(cy + ty * TILE - TILE / 2)
          if (wx >= 0 && wy >= 0 && wx + TILE <= S && wy + TILE <= S) {
            ctx.drawImage(sprites.water, 0, 0, 16, 16, wx, wy, TILE, TILE)
          }
        }
      }
    }
    // Slight blue overlay to blend tiles
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.fillStyle = '#4488ff'
    ctx.beginPath()
    ctx.ellipse(cx, cy, halfW * TILE, halfH * TILE, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    stats.hasPond = true
  }

  // ── 1. Grass base ─────────────────────────────────────────────────────────
  for (let r = 0; r < TILES; r++)
    for (let c = 0; c < TILES; c++)
      ctx.drawImage(sprites.grass, c * TILE, r * TILE, TILE, TILE)

  // Micro-variation
  for (let r = 0; r < TILES; r++) {
    for (let c = 0; c < TILES; c++) {
      const v = Math.random()
      if      (v < 0.09) { ctx.fillStyle = 'rgba(0,0,0,0.10)';       ctx.fillRect(c*TILE, r*TILE, TILE, TILE) }
      else if (v < 0.15) { ctx.fillStyle = 'rgba(180,255,80,0.05)';  ctx.fillRect(c*TILE, r*TILE, TILE, TILE) }
    }
  }

  // ── 2. Flowers (scattered, drawn early so features go on top) ─────────────
  const numFlowers = rand(30, 55)
  for (let i = 0; i < numFlowers; i++) {
    const fc = rand(0, 9)
    const fr = rand(0, 4)
    const fw = 40
    ctx.drawImage(sprites.flowers, fc * 16, fr * 16, 16, 16,
      rand(0, S - fw), rand(0, S - fw), fw, fw,
    )
  }

  // ── 3. Layout ──────────────────────────────────────────────────────────────
  const layouts: Layout[] = ['farm', 'orchard', 'crossroads', 'forest_edge', 'dual_field', 'village', 'windmill_farm', 'pond']
  const layout = choose(layouts)

  if (layout === 'farm') {
    const pr = rand(10, 16)
    addHPath(pr)
    addFarm(rand(0, 3),   rand(0, 3),   2, 2)
    addFarm(rand(12, 17), rand(0, 3),   1, 2)
    if (Math.random() > 0.35) addFarm(rand(4, 9), rand(0, 6), 1, 1)
    addFenceLine(0, (pr - 1) * TILE, rand(4, 8))
    if (Math.random() > 0.45) addHouse(rand(0, S/2 - HOUSE_W), rand(0, pr * TILE - HOUSE_H))
    addEdgeTrees('bottom', rand(5, 9))
    addEdgeTrees('left',   rand(4, 7))
    addEdgeTrees('right',  rand(4, 7))
    addTreesIn(rand(3, 6), 0, 0, S, pr * TILE - BIG_H)

  } else if (layout === 'orchard') {
    const cW = S / 4, cH = S / 3
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++)
        addAnyTree(c * cW + rand(16, cW - BIG_W - 16), r * cH + rand(14, cH - BIG_H - 14))
    addFarm(rand(0, 5),   rand(5, 14), 1, 1)
    addFarm(rand(16, 20), rand(2, 10), 1, 1)
    if (Math.random() > 0.4) addVPath(rand(1, 5))
    addEdgeTrees(choose(['top', 'bottom', 'left', 'right'] as const), rand(4, 7))

  } else if (layout === 'crossroads') {
    const pr = rand(6, 13), pc = rand(6, 13)
    addHPath(pr); addVPath(pc)
    const quads: [number, number][] = [
      [rand(0, pc - 5), rand(0, pr - 5)],
      [rand(pc + 4, 19), rand(0, pr - 5)],
      [rand(0, pc - 5), rand(pr + 4, 19)],
      [rand(pc + 4, 19), rand(pr + 4, 19)],
    ]
    quads.forEach(([tx, ty]) => { if (Math.random() > 0.20) addFarm(tx, ty, 1, 1) })
    addFenceLine(rand(0, TILE * 2), rand(0, TILE * 2), 2)
    addFenceLine(rand(S - TILE*4, S - TILE*3), rand(0, TILE*2), 2)
    addTreesIn(rand(4, 8), 0, 0, S, S)
    addTree(rand(0, 48),          rand(0, 32))
    addTree(S - OAK_W - rand(0,48), rand(0, 32))
    addTree(rand(0, 48),          S - OAK_H - rand(0, 32))
    addTree(S - OAK_W - rand(0,48), S - OAK_H - rand(0, 32))

  } else if (layout === 'forest_edge') {
    const edges = (['top', 'bottom', 'left', 'right'] as const)
      .slice().sort(() => Math.random() - 0.5).slice(0, rand(2, 3))
    edges.forEach(e => addEdgeTrees(e, rand(7, 12)))
    addFarm(rand(3, 8),   rand(3, 8),   rand(1, 2), rand(1, 2))
    addFarm(rand(10, 18), rand(7, 14),  1, 1)
    addTreesIn(rand(3, 6), 120, 120, S - 120, S - 120)

  } else if (layout === 'dual_field') {
    const pc = rand(9, 15)
    addVPath(pc)
    addFarm(0,               rand(0, 4),   1, 2)
    addFarm(rand(3, 7),      rand(4, 13),  1, 1)
    addFarm(rand(pc+4, 20),  rand(0, 4),   1, 2)
    addFarm(rand(pc+3, 19),  rand(7, 16),  1, 1)
    addFenceLine((pc - 1) * TILE, rand(TILE*3, TILE*7), rand(4, 7), true)
    addEdgeTrees('left',   rand(5, 9))
    addEdgeTrees('right',  rand(5, 9))
    addEdgeTrees('top',    rand(3, 5))
    addEdgeTrees('bottom', rand(3, 5))

  } else if (layout === 'village') {
    const pr = rand(6, 11)
    addHPath(pr)
    const barnX = rand(TILE, S - BARN_W - TILE)
    const barnY = clamp(rand(0, Math.max(TILE, pr * TILE - BARN_H)), 0, S - BARN_H)
    addBarn(barnX, barnY)
    addFenceLine(rand(0, TILE*4), (pr - 1) * TILE, rand(3, 6))
    addFarm(rand(0, 5),   rand(pr+4, 19), 1, 1)
    addFarm(rand(13, 19), rand(0, pr-5),  1, 1)
    addTreesIn(rand(5, 10), 0, (pr + 2) * TILE, S, S)
    addEdgeTrees('top',   rand(3, 5))
    addEdgeTrees('left',  rand(3, 5))
    addEdgeTrees('right', rand(3, 5))

  } else if (layout === 'windmill_farm') {
    // Windmill as focal point, silo beside it, fenced farmland
    const winX = rand(TILE * 2, S - WINDM_W - TILE * 2)
    const winY = rand(TILE,     S / 2 - WINDM_H)
    ctx.drawImage(sprites.windmill, 0, 0, 128, 112, winX, winY, WINDM_W, WINDM_H)
    stats.hasWindmill = true

    // Silo next to windmill
    const siloX = clamp(winX + WINDM_W + TILE, 0, S - SILO_W)
    const siloY = clamp(winY + WINDM_H - SILO_H, 0, S - SILO_H)
    ctx.drawImage(sprites.silo, 0, 0, 48, 80, siloX, siloY, SILO_W, SILO_H)

    // Fence rows along bottom of windmill
    addFenceLine(clamp(winX - TILE*2, 0, S), winY + WINDM_H, rand(6, 10))

    // Farmland patches around
    addFarm(0,              rand(11, 17), 2, 2)
    addFarm(rand(14, 19),   rand(9, 15),  2, 2)
    addFarm(rand(5, 10),    rand(16, 20), 1, 1)

    // Surrounding trees
    addEdgeTrees('top',    rand(2, 5))
    addEdgeTrees('bottom', rand(4, 7))
    addEdgeTrees('left',   rand(4, 7))
    addEdgeTrees('right',  rand(3, 6))
    addTreesIn(rand(2, 4), 0, 0, winX - BIG_W, winY + WINDM_H)

  } else {
    // pond — oval water feature, trees, farmland on sides
    const pondCX = S / 2 + rand(-150, 150)
    const pondCY = S / 2 + rand(-150, 150)
    const halfW  = rand(3, 6)
    const halfH  = rand(2, 5)
    drawPond(pondCX, pondCY, halfW, halfH)

    // Well near pond edge
    const wellX = clamp(pondCX + halfW * TILE + TILE, 0, S - WELL_W)
    const wellY = clamp(pondCY - WELL_H / 2,          0, S - WELL_H)
    ctx.drawImage(sprites.well, 0, 0, 32, 48, wellX, wellY, WELL_W, WELL_H)

    // Trees framing the pond
    addTreesIn(rand(4, 7), 0, 0, Math.max(0, pondCX - halfW * TILE - BIG_W), S)
    addTreesIn(rand(4, 7), Math.min(S, pondCX + halfW * TILE + TILE), 0, S, S)
    addEdgeTrees('top',    rand(3, 5))
    addEdgeTrees('bottom', rand(3, 5))

    // Farmland away from pond
    addFarm(0,             rand(0, 6),  2, 2)
    addFarm(rand(17, 21),  rand(0, 6),  2, 2)
  }

  // ── 4. Animals ────────────────────────────────────────────────────────────
  // Animal sheets are 64×64 with 4 frames in a 2×2 grid (each frame 32×32).
  // Draw only the top-left frame (frame 0) to show a single clean animal.
  const animalPool: AnimalType[] = ['chicken', 'cow', 'pig', 'sheep']
  const animalCount = rand(0, 3)
  for (let i = 0; i < animalCount; i++) {
    const type = choose(animalPool)
    ctx.drawImage(sprites[type], 0, 0, 32, 32,
      rand(0, S - ANIMAL_SZ), rand(0, S - ANIMAL_SZ),
      ANIMAL_SZ, ANIMAL_SZ,
    )
    stats.animals.push(type)
  }

  // ── 5. Beehive (30%) ──────────────────────────────────────────────────────
  if (Math.random() < 0.30) {
    ctx.drawImage(sprites.beehive, rand(0, S - 64), rand(0, S - 64), 64, 64)
    stats.hasBeehive = true
  }

  // ── 6. Score + tier ───────────────────────────────────────────────────────
  const score = Math.round(
    stats.treeCount      * 2  +
    stats.farmlandBlocks * 3  +
    stats.animals.length * 10 +
    (stats.hasBeehive  ? 7  : 0) +
    (stats.hasPath     ? 3  : 0) +
    (stats.hasWindmill ? 10 : 0) +
    (stats.hasPond     ? 8  : 0) +
    LAYOUT_BONUS[layout]
  )
  const tier = scoreToTier(score)

  return { ...stats, layout, score, tier }
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatPill({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: '#2a1505', border: '2px solid #5c3317',
      padding: '6px 10px',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <div>
        <div style={{ color: '#7a5030', fontFamily: '"Press Start 2P", monospace', fontSize: 7, lineHeight: 1.4 }}>{label}</div>
        <div style={{ color: '#e8c090', fontFamily: '"Press Start 2P", monospace', fontSize: 10, lineHeight: 1.4 }}>{value}</div>
      </div>
    </div>
  )
}

function TierSlot({ tier, approved, target }: { tier: Tier; approved: number; target: number }) {
  const remaining = Math.max(0, target - approved)
  const full      = remaining === 0
  return (
    <div style={{
      flex: 1, padding: '8px 4px', textAlign: 'center',
      background: full ? '#111' : `${TIER_COLORS[tier]}22`,
      border: `2px solid ${full ? '#333' : TIER_COLORS[tier]}`,
    }}>
      <div style={{ color: full ? '#444' : TIER_COLORS[tier], fontFamily: '"Press Start 2P", monospace', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>
        {tier[0]}
      </div>
      <div style={{ color: full ? '#333' : '#e8c090', fontFamily: '"Press Start 2P", monospace', fontSize: 11, marginTop: 4 }}>
        {approved}/{target}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const BTN_BASE: React.CSSProperties = {
  fontFamily: '"Press Start 2P", monospace', fontSize: 13,
  padding: '14px 36px', cursor: 'pointer', border: '3px solid', lineHeight: 1.4,
}

export default function GeneratorPage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const spritesRef = useRef<Sprites | null>(null)

  const [ready,      setReady]      = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [approved,   setApproved]   = useState(0)
  const [generated,  setGenerated]  = useState(0)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [curMeta,    setCurMeta]    = useState<Omit<PlotMeta,'plotNumber'|'filename'> | null>(null)
  const [tierCounts, setTierCounts] = useState<Record<Tier, number>>({ bronze:0, silver:0, gold:0, diamond:0 })

  useEffect(() => {
    loadAllSprites()
      .then(s => { spritesRef.current = s; setReady(true) })
      .catch(e => setError(e.message))
  }, [])

  const generateNew = useCallback(() => {
    if (!canvasRef.current || !spritesRef.current) return
    const meta = drawPlot(canvasRef.current, spritesRef.current)
    setCurMeta(meta)
    setGenerated(g => g + 1)
  }, [])

  useEffect(() => { if (ready) generateNew() }, [ready, generateNew])

  const handleApprove = useCallback(async () => {
    if (!canvasRef.current || !curMeta || saving || done) return
    setSaving(true); setError(null)
    const nextNum = approved + 1
    try {
      const imageData = canvasRef.current.toDataURL('image/png')
      const meta: PlotMeta = { ...curMeta, plotNumber: nextNum, filename: `plot-${String(nextNum).padStart(3,'0')}.png` }
      const res = await fetch('/api/generator/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, meta }),
      })
      if (!res.ok) throw new Error('Save failed')
      setApproved(nextNum)
      setTierCounts(tc => ({ ...tc, [curMeta.tier]: tc[curMeta.tier] + 1 }))
      if (nextNum >= 100) setDone(true)
      else generateNew()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }, [approved, curMeta, saving, done, generateNew])

  const handleDelete = useCallback(() => {
    if (saving || done) return
    generateNew()
  }, [saving, done, generateNew])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', 'a', 'A', 'Enter'].includes(e.key))              handleApprove()
      if (['ArrowLeft',  'd', 'D', 'Delete', 'Backspace'].includes(e.key)) handleDelete()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleApprove, handleDelete])

  const pct  = (approved / 100) * 100
  const tier = curMeta?.tier ?? 'bronze'

  // Display: 1600px canvas shown at 600px
  const DISPLAY = 600

  return (
    <div style={{
      minHeight: '100vh', background: '#120a02',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 32, gap: 14,
    }}>
      <h1 style={{ color: '#ffd700', fontFamily: '"Press Start 2P", monospace', fontSize: 18, margin: 0 }}>
        Plot Generator v3
      </h1>
      <p style={{ color: '#5c3317', fontFamily: '"Press Start 2P", monospace', fontSize: 8, margin: 0 }}>
        1600×1600 · big trees · water ponds · windmills · silos · wells
      </p>

      {/* Counter */}
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 12, color: '#888', textAlign: 'center' }}>
        <span style={{ color: '#7fffb0', fontSize: 20 }}>{approved}</span>
        <span> / 100 approved · </span>
        <span style={{ color: '#555' }}>{generated} seen</span>
      </div>

      {error && (
        <p style={{ color: '#ff6644', fontFamily: '"Press Start 2P", monospace', fontSize: 10, margin: 0 }}>{error}</p>
      )}

      {done ? (
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <div style={{ color: '#7fffb0', fontFamily: '"Press Start 2P", monospace', fontSize: 16, lineHeight: 2 }}>
            All 100 plots saved!
          </div>
          <div style={{ color: '#888', fontFamily: '"Press Start 2P", monospace', fontSize: 10, marginTop: 8 }}>
            public/plots/ · metadata in each plot-NNN.json
          </div>
        </div>
      ) : (
        <>
          {/* Canvas — generated at 1600×1600, displayed at 600×600 */}
          <div style={{
            border: '4px solid #5c3317',
            boxShadow: '6px 6px 0 #3a1f0a, inset 2px 2px 0 #e8c090',
            lineHeight: 0, width: DISPLAY, height: DISPLAY, flexShrink: 0,
          }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ display: 'block', imageRendering: 'pixelated', width: DISPLAY, height: DISPLAY }}
            />
          </div>

          {/* Tier badge + stat pills */}
          {curMeta && (
            <div style={{ width: DISPLAY, display: 'flex', gap: 8, alignItems: 'stretch', flexWrap: 'wrap' }}>
              <div style={{
                background: TIER_COLORS[tier],
                boxShadow: `3px 3px 0 ${TIER_SHADOW[tier]}`,
                padding: '8px 16px',
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 2,
                minWidth: 90,
              }}>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: tier === 'silver' ? '#2a1000' : '#fff8f0', opacity: 0.8, textTransform: 'uppercase', letterSpacing: 1 }}>Tier</div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 14, color: tier === 'silver' ? '#1a0800' : '#fff', textTransform: 'uppercase' }}>{tier}</div>
                <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: tier === 'silver' ? '#3a1a00' : 'rgba(255,255,255,0.7)' }}>Score: {curMeta.score}</div>
              </div>

              <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'stretch' }}>
                <StatPill icon="🌳" label="Trees"    value={curMeta.treeCount} />
                <StatPill icon="🌾" label="Farmland" value={`${curMeta.farmlandBlocks} patches`} />
                {curMeta.animals.length > 0 && (
                  <StatPill icon="🐾" label="Animals"  value={curMeta.animals.map(a => ANIMAL_EMOJI[a]).join(' ')} />
                )}
                <StatPill icon="🛤️" label="Path"     value={curMeta.hasPath     ? 'yes' : 'none'} />
                {curMeta.hasBeehive   && <StatPill icon="🍯" label="Beehive"  value="yes" />}
                {curMeta.hasWindmill  && <StatPill icon="⚙️" label="Windmill" value="yes" />}
                {curMeta.hasPond      && <StatPill icon="💧" label="Pond"     value="yes" />}
                <StatPill icon="📐" label="Layout"   value={curMeta.layout.replace('_', ' ')} />
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ width: DISPLAY, height: 12, background: '#2a1000', border: '2px solid #5c3317' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#ffd700' : '#2d5a1b', transition: 'width 0.2s' }} />
          </div>

          {/* Tier distribution */}
          <div style={{ width: DISPLAY, display: 'flex', gap: 6 }}>
            {(['bronze', 'silver', 'gold', 'diamond'] as Tier[]).map(t => (
              <TierSlot key={t} tier={t} approved={tierCounts[t]} target={TARGET[t]} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 20 }}>
            <button onClick={handleDelete} disabled={saving || !ready} style={{
              ...BTN_BASE, background: '#5c1a1a', borderColor: '#3a0a0a', color: '#ffcccc',
              boxShadow: 'inset 1px 1px 0 #8b2a2a, inset -1px -1px 0 #2a0808, 3px 3px 0 #1a0404',
              opacity: (saving || !ready) ? 0.5 : 1,
            }}>✗ Skip</button>

            <button onClick={handleApprove} disabled={saving || !ready} style={{
              ...BTN_BASE,
              background: curMeta ? TIER_COLORS[tier] : '#1a5c1a',
              borderColor: curMeta ? TIER_SHADOW[tier] : '#0a3a0a',
              color: tier === 'silver' ? '#1a0800' : '#fff',
              boxShadow: curMeta ? `inset 1px 1px 0 rgba(255,255,255,0.3), 3px 3px 0 ${TIER_SHADOW[tier]}` : '',
              opacity: (saving || !ready) ? 0.5 : 1,
            }}>
              {saving ? 'Saving…' : `✓ Approve${curMeta ? ` (${tier})` : ''}`}
            </button>
          </div>

          <p style={{ color: '#333', fontFamily: '"Press Start 2P", monospace', fontSize: 9, margin: 0 }}>
            A / → = approve · D / ← / Delete = skip
          </p>
        </>
      )}
    </div>
  )
}
