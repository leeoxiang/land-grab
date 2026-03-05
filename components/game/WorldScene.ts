import Phaser from 'phaser'
import { PLOT_TIERS, WORLD_COLS, WORLD_ROWS, PLOT_SIZE, PLOT_GAP, type PlotTier } from '@/config/game'
import { CHARACTER_DEFS, getSavedCharacter, saveCharacter, getPlayerName, savePlayerName } from '@/config/characters'
import type { Plot } from '@/types'

const STEP         = PLOT_SIZE + PLOT_GAP
const PLAYER_SPEED = 160 // px/s

declare global { var __fw: { wallet: string | null; onClick: ((p: Plot) => void) | null; focusPlot: ((col: number, row: number) => void) | null } }
if (!globalThis.__fw) globalThis.__fw = { wallet: null, onClick: null, focusPlot: null }

export function setSceneCallbacks(wallet: string | null, onClick: (p: Plot) => void) {
  globalThis.__fw.wallet  = wallet
  globalThis.__fw.onClick = onClick
}

export interface SceneState {
  worldW:     number
  worldH:     number
  playerX:    number
  playerY:    number
  camLeft:    number
  camTop:     number
  camRight:   number
  camBottom:  number
  plots:      Plot[]
  currentCol: number
  currentRow: number
}

export class WorldScene extends Phaser.Scene {
  private plots:         Plot[]
  private plotObjects:   Map<number, Phaser.GameObjects.Container>
  private walletAddress: string | null
  private onPlotClick:   ((plot: Plot) => void) | null
  private cam:           Phaser.Cameras.Scene2D.Camera | null

  private player:        Phaser.GameObjects.Sprite | null
  private currentCharId: string
  private cursors:       Phaser.Types.Input.Keyboard.CursorKeys | null
  private wasd:          Record<string, Phaser.Input.Keyboard.Key>
  private totalW:        number
  private totalH:        number
  private currentCol:    number
  private currentRow:    number
  private lastDir:       'down' | 'left' | 'right' | 'up'
  private isNavigating:  boolean
  // Reference to the in-progress animated nav tween (so instant jumps can kill it)
  private navTween:      Phaser.Tweens.Tween | null

  // Wandering animals
  private animalSprites: Phaser.GameObjects.Sprite[]

  // Hired farmer NPCs — keyed by plot id so refreshPlot can replace them
  private farmerSprites: Map<number, Phaser.GameObjects.Sprite[]>

  // Drag-to-pan state
  private dragStartX:  number
  private dragStartY:  number
  private dragScrollX: number
  private dragScrollY: number
  private isDragging:  boolean

  // Name tag text object shown above the player sprite
  private playerNameTag: Phaser.GameObjects.Text | null

  // Whether the camera is actively following the player sprite
  private isFollowingPlayer: boolean

  // True after an instant focusPlot — camera is following with lerp=1 (snap).
  // Switches to lerp=0.12 (smooth) the first time the player moves.
  private isSnapFollow: boolean

  // Stored at create() so zoom handler can compare
  private coverZoom: number


  constructor() {
    super({ key: 'WorldScene' })
    this.plots         = []
    this.plotObjects   = new Map()
    this.walletAddress = null
    this.onPlotClick   = null
    this.cam           = null
    this.player        = null
    this.currentCharId = 'player'
    this.cursors       = null
    this.wasd          = {}
    this.totalW        = 0
    this.totalH        = 0
    this.currentCol    = 0
    this.currentRow    = 0
    this.lastDir       = 'down'
    this.isNavigating  = false
    this.navTween      = null
    this.animalSprites = []
    this.dragStartX    = 0
    this.dragStartY    = 0
    this.dragScrollX   = 0
    this.dragScrollY   = 0
    this.isDragging        = false
    this.isFollowingPlayer = false
    this.isSnapFollow      = false
    this.coverZoom         = 1
    this.farmerSprites     = new Map()
    this.playerNameTag     = null
  }

  preload() {
    this.load.json('plots', '/api/plots')

    // Tile textures
    this.load.image('grass-tile', '/assets/grass.png')
    this.load.image('path-tile',  '/assets/path.png')

    // Generated plot art (100 PNGs — one per plot)
    for (let i = 1; i <= 100; i++) {
      const p = String(i).padStart(3, '0')
      this.load.image(`plot-${p}`, `/plots/plot-${p}.png`)
    }

    // All character spritesheets (includes default 'player')
    for (const def of CHARACTER_DEFS) {
      this.load.spritesheet(def.id, def.file, {
        frameWidth:  def.frameWidth,
        frameHeight: def.frameHeight,
      })
    }

    // Animal sprites — 64×64 single-frame PNGs; load as 1-frame spritesheets so
    // add.sprite() works uniformly (movement is tween-only, no frame animation).
    const animalCfg = { frameWidth: 64, frameHeight: 64 }
    this.load.spritesheet('chicken', '/assets/chicken.png', animalCfg)
    this.load.spritesheet('cow',     '/assets/cow.png',     animalCfg)
    this.load.spritesheet('pig',     '/assets/pig.png',     animalCfg)
    this.load.spritesheet('sheep',   '/assets/sheep.png',   animalCfg)
    this.load.image('beehive', '/assets/beehive.png')

    // Path decorations
    this.load.image('deco-lantern', '/assets/decorations/Lantern.png')
    this.load.spritesheet('deco-flowers', '/assets/decorations/Flowers.png', { frameWidth: 16, frameHeight: 16 })
    this.load.spritesheet('deco-hay',     '/assets/decorations/Hay_Bales.png', { frameWidth: 16, frameHeight: 16 })
  }

  create() {
    const raw          = this.cache.json.get('plots')
    this.plots         = Array.isArray(raw) ? raw : []
    this.walletAddress = globalThis.__fw?.wallet  ?? null
    this.onPlotClick   = globalThis.__fw?.onClick ?? null

    // Bridge: React components call globalThis.__fw.focusPlot(col, row) to teleport
    globalThis.__fw.focusPlot = (col: number, row: number) => this.focusPlot(col, row, false)

    this.cam    = this.cameras.main
    this.totalW = WORLD_COLS * STEP
    this.totalH = WORLD_ROWS * STEP

    const worldPxW = this.totalW + PLOT_GAP
    const worldPxH = this.totalH + PLOT_GAP

    // ── Grass background (tiled) ──────────────────────────────────────────────
    this.add.tileSprite(0, 0, worldPxW, worldPxH, 'grass-tile').setOrigin(0, 0)

    // ── Dirt paths (tiled strips) ─────────────────────────────────────────────
    for (let r = 0; r <= WORLD_ROWS; r++) {
      this.add.tileSprite(0, r * STEP, worldPxW, PLOT_GAP, 'path-tile').setOrigin(0, 0)
    }
    for (let c = 0; c <= WORLD_COLS; c++) {
      this.add.tileSprite(c * STEP, 0, PLOT_GAP, worldPxH, 'path-tile').setOrigin(0, 0)
    }

    // ── Draw all plots ────────────────────────────────────────────────────────
    this.plots.forEach(plot => this.drawPlot(plot))

    // ── Spawn one wandering animal per owned plot ─────────────────────────────
    this.plots.forEach(plot => {
      if (plot.owner_wallet) this.spawnAnimal(plot)
    })

    // ── Spawn hired farmer NPCs ────────────────────────────────────────────────
    this.plots.forEach(plot => {
      if ((plot.farmer_count ?? 0) > 0) this.spawnFarmerNPCs(plot)
    })

    // ── Path decorations ──────────────────────────────────────────────────────
    this.spawnPathDecorations()

    // ── Player animations (all characters, prefixed by charId) ────────────────
    for (const def of CHARACTER_DEFS) {
      const dirs: Array<[string, number, number]> = [
        [`${def.id}-down`,  def.downStart,  def.downEnd],
        [`${def.id}-up`,    def.upStart,    def.upEnd],
        [`${def.id}-right`, def.rightStart, def.rightEnd],
      ]
      for (const [key, start, end] of dirs) {
        if (!this.anims.exists(key)) {
          this.anims.create({
            key,
            frames:    this.anims.generateFrameNumbers(def.id, { start, end }),
            frameRate: 8,
            repeat:    -1,
          })
        }
      }
    }

    // ── Player sprite — use saved or random character ─────────────────────────
    const initDef      = getSavedCharacter()
    this.currentCharId = initDef.id

    const startX = PLOT_GAP + PLOT_SIZE / 2
    const startY = PLOT_GAP + PLOT_SIZE / 2
    this.player = this.add.sprite(startX, startY, initDef.id, initDef.downStart)
    this.player.setScale(initDef.scale)
    this.player.setDepth(10)
    this.player.play(`${initDef.id}-down`)
    this.player.stop()  // idle on first frame

    // ── Name tag above player ─────────────────────────────────────────────────
    this.playerNameTag = this.add.text(startX, startY - 36, getPlayerName(), {
      fontSize:        '8px',
      fontFamily:      '"Press Start 2P", monospace',
      color:           '#ffffff',
      stroke:          '#1a0a00',
      strokeThickness: 3,
    }).setOrigin(0.5, 1).setDepth(12)

    // ── Camera — cover zoom so ONE plot fills the viewport ────────────────────
    const vw   = this.scale.width
    const vh   = this.scale.height
    // Cover mode: zoom so the plot dimension that's smaller than the viewport fills it
    this.coverZoom = Math.max(vw / PLOT_SIZE, vh / PLOT_SIZE) * 1.02
    this.cam.setZoom(this.coverZoom)

    // Start on the player's first owned plot, or a random one
    const ownedPlot = this.walletAddress
      ? this.plots.find(p => p.owner_wallet === this.walletAddress)
      : undefined
    const startPlot = ownedPlot ?? this.plots[Phaser.Math.Between(0, this.plots.length - 1)]
    this.focusPlot(startPlot?.col ?? 0, startPlot?.row ?? 0, false)

    // ── Keyboard ──────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd    = this.input.keyboard!.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>

    // ── Scroll to zoom ────────────────────────────────────────────────────────
    this.input.on('wheel', (_: unknown, __: unknown, ___: unknown, deltaY: number) => {
      const z = Phaser.Math.Clamp(this.cam!.zoom - deltaY * 0.001, 0.3, 6)
      this.cam!.setZoom(z)
      this.updateCamBounds()
    })

    // ── Left-click drag-to-pan + click-to-open-plot ───────────────────────────
    const DRAG_THRESHOLD = 6

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) return
      this.isDragging  = false
      this.dragStartX  = p.x
      this.dragStartY  = p.y
      this.dragScrollX = this.cam!.scrollX
      this.dragScrollY = this.cam!.scrollY
    })

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown || p.rightButtonDown()) return
      const dx = p.x - this.dragStartX
      const dy = p.y - this.dragStartY
      if (!this.isDragging && Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        this.isDragging        = true
        this.isFollowingPlayer = false
        this.cam!.stopFollow()
      }
      if (this.isDragging) {
        const zoom = this.cam!.zoom
        this.cam!.scrollX = this.dragScrollX - dx / zoom
        this.cam!.scrollY = this.dragScrollY - dy / zoom
      }
    })

    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonReleased()) return
      if (this.isDragging) {
        // Don't snap back — let camera stay where the user dragged it.
        // Follow will resume naturally when the player starts moving via WASD.
        this.isDragging = false
        return
      }
      // Plain click — open the plot under the cursor
      const worldX = this.cam!.scrollX + p.x / this.cam!.zoom
      const worldY = this.cam!.scrollY + p.y / this.cam!.zoom
      for (const plot of this.plots) {
        const px = plot.col * STEP + PLOT_GAP
        const py = plot.row * STEP + PLOT_GAP
        if (worldX >= px && worldX <= px + PLOT_SIZE && worldY >= py && worldY <= py + PLOT_SIZE) {
          this.onPlotClick?.(plot)
          break
        }
      }
    })
  }

  update(_: number, delta: number) {
    // Block movement during plot navigation tween
    if (!this.player || !this.cursors || this.isNavigating) return

    // Don't capture WASD when user is typing in an input/textarea
    const active = typeof document !== 'undefined' ? document.activeElement : null
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return

    const dt    = delta / 1000
    const speed = PLAYER_SPEED
    let vx = 0, vy = 0

    if (this.cursors.left.isDown  || this.wasd.left?.isDown)  vx = -speed
    if (this.cursors.right.isDown || this.wasd.right?.isDown) vx =  speed
    if (this.cursors.up.isDown    || this.wasd.up?.isDown)    vy = -speed
    if (this.cursors.down.isDown  || this.wasd.down?.isDown)  vy =  speed

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707 }

    // Clamp player to full world bounds (free roaming across all plots)
    const worldPxW = WORLD_COLS * STEP + PLOT_GAP
    const worldPxH = WORLD_ROWS * STEP + PLOT_GAP
    const nx = Phaser.Math.Clamp(this.player.x + vx * dt, PLOT_GAP * 0.5, worldPxW - PLOT_GAP * 0.5)
    const ny = Phaser.Math.Clamp(this.player.y + vy * dt, PLOT_GAP * 0.5, worldPxH - PLOT_GAP * 0.5)
    this.player.setPosition(nx, ny)

    // Update current plot based on player position (for minimap / UI)
    this.currentCol = Phaser.Math.Clamp(Math.floor(nx / STEP), 0, WORLD_COLS - 1)
    this.currentRow = Phaser.Math.Clamp(Math.floor(ny / STEP), 0, WORLD_ROWS - 1)

    // ── Resume / switch camera follow when player starts moving ──────────────
    const moving = vx !== 0 || vy !== 0
    if (moving && this.cam && this.player) {
      if (this.isSnapFollow) {
        // First WASD after an instant nav — switch from snap (lerp=1) to smooth
        this.cam.startFollow(this.player, true, 0.12, 0.12)
        this.isSnapFollow      = false
        this.isFollowingPlayer = true
      } else if (!this.isFollowingPlayer) {
        // Follow was off (e.g. after a drag) — resume smooth follow
        this.cam.startFollow(this.player, true, 0.12, 0.12)
        this.isFollowingPlayer = true
      }
    }

    // ── Walk animations ───────────────────────────────────────────────────────
    if (moving) {
      let dir: 'down' | 'left' | 'right' | 'up' = this.lastDir
      if      (vy > 0) dir = 'down'
      else if (vy < 0) dir = 'up'
      if      (vx < 0) dir = 'left'
      else if (vx > 0) dir = 'right'

      if (dir !== this.lastDir || !this.player.anims.isPlaying) {
        if (dir === 'left') {
          this.player.play(`${this.currentCharId}-right`, true)
          this.player.setFlipX(true)
        } else {
          this.player.setFlipX(false)
          this.player.play(`${this.currentCharId}-${dir}`, true)
        }
        this.lastDir = dir
      }
    } else {
      if (this.player.anims.isPlaying) {
        this.player.stop()
      }
    }

    // Keep name tag centred above player
    if (this.playerNameTag && this.player) {
      this.playerNameTag.setPosition(this.player.x, this.player.y - 34)
    }

  }

  // ─── Navigation ───────────────────────────────────────────────────────────────

  focusPlot(col: number, row: number, animate = true) {
    this.currentCol = Phaser.Math.Clamp(col, 0, WORLD_COLS - 1)
    this.currentRow = Phaser.Math.Clamp(row, 0, WORLD_ROWS - 1)

    const cx       = this.currentCol * STEP + PLOT_GAP + PLOT_SIZE / 2
    const cy       = this.currentRow * STEP + PLOT_GAP + PLOT_SIZE / 2
    const worldPxW = WORLD_COLS * STEP + PLOT_GAP
    const worldPxH = WORLD_ROWS * STEP + PLOT_GAP

    // ── Always kill any in-progress nav tween first ───────────────────────────
    // If we don't, the old tween's onUpdate keeps overwriting cam.scrollX/Y
    // every frame, making every instant jump appear to do nothing.
    if (this.navTween) {
      this.navTween.stop()
      this.navTween = null
      this.isNavigating = false
    }

    if (!this.cam) return

    if (animate) {
      this.isNavigating = true
      this.cam.stopFollow()
      this.isFollowingPlayer = false
      this.cam.setBounds(0, 0, worldPxW, worldPxH)

      const cam     = this.cam
      const scroll  = { x: cam.scrollX, y: cam.scrollY }
      const zoom    = cam.zoom
      const targetX = cx - cam.width  / (2 * zoom)
      const targetY = cy - cam.height / (2 * zoom)

      this.navTween = this.tweens.add({
        targets:  scroll,
        x:        targetX,
        y:        targetY,
        duration: 420,
        ease:     'Power2',
        onUpdate: () => {
          cam.scrollX = scroll.x
          cam.scrollY = scroll.y
        },
        onComplete: () => {
          this.navTween      = null
          this.isNavigating  = false
          this.player?.setPosition(cx, cy)
          this.updateCamBounds()
          if (this.player) {
            this.cam!.startFollow(this.player, true, 0.12, 0.12)
            this.isFollowingPlayer = true
          }
        },
      })
    } else {
      // ── Instant jump via the same tween mechanism as animate=true ─────────
      // Direct cam.scrollX/Y assignments from React event context (outside
      // Phaser's game loop) are overridden by camera preRender before the
      // next render frame. Using a duration=1 tween ensures the scroll is
      // set from inside Phaser's update cycle (tween onUpdate fires before
      // preRender), which is why the animated path works but direct assignment
      // never has.
      if (this.cam.zoom < this.coverZoom * 0.70) {
        this.cam.setZoom(this.coverZoom)
      }
      this.isDragging    = false
      this.isNavigating  = true         // block WASD for the single tick
      this.cam.stopFollow()
      this.isFollowingPlayer = false
      this.player?.setPosition(cx, cy)

      const cam     = this.cam
      const scroll  = { x: cam.scrollX, y: cam.scrollY }
      const zoom    = cam.zoom
      const targetX = cx - cam.width  / (2 * zoom)
      const targetY = cy - cam.height / (2 * zoom)

      cam.setBounds(0, 0, worldPxW, worldPxH)

      this.navTween = this.tweens.add({
        targets:  scroll,
        x:        targetX,
        y:        targetY,
        duration: 1,          // 1 ms — completes on the very next Phaser tick
        ease:     'Linear',
        onUpdate: () => {
          cam.scrollX = scroll.x
          cam.scrollY = scroll.y
        },
        onComplete: () => {
          this.navTween     = null
          this.isNavigating = false
          cam.scrollX = targetX
          cam.scrollY = targetY
          this.updateCamBounds()
          if (this.player) {
            this.cam?.startFollow(this.player, true, 1, 1)
            this.isFollowingPlayer = true
            this.isSnapFollow      = true
          }
        },
      })
    }
  }

  /**
   * Choose camera bounds based on current zoom level:
   * – Zoomed in (>= 70% of cover zoom): lock to current plot + half-gap.
   * – Zoomed out (<  70% of cover zoom): open to the full world so the
   *   player can see all 100 plots without dead green space.
   */
  private updateCamBounds() {
    if (!this.cam) return
    const worldPxW = WORLD_COLS * STEP + PLOT_GAP
    const worldPxH = WORLD_ROWS * STEP + PLOT_GAP
    this.cam.setBounds(0, 0, worldPxW, worldPxH)
  }


  navigateDelta(dc: number, dr: number) {
    this.focusPlot(this.currentCol + dc, this.currentRow + dr, false)
  }

  navigateTo(worldX: number, worldY: number) {
    const col = Math.round((worldX - PLOT_GAP - PLOT_SIZE / 2) / STEP)
    const row = Math.round((worldY - PLOT_GAP - PLOT_SIZE / 2) / STEP)
    this.focusPlot(col, row)
  }

  // ─── Public state for React ───────────────────────────────────────────────────

  getSceneState(): SceneState | null {
    if (!this.cam || !this.player) return null
    const zoom = this.cam.zoom
    return {
      worldW:     this.totalW + PLOT_GAP,
      worldH:     this.totalH + PLOT_GAP,
      playerX:    this.player.x,
      playerY:    this.player.y,
      camLeft:    this.cam.scrollX,
      camTop:     this.cam.scrollY,
      camRight:   this.cam.scrollX + this.cam.width  / zoom,
      camBottom:  this.cam.scrollY + this.cam.height / zoom,
      plots:      this.plots,
      currentCol: this.currentCol,
      currentRow: this.currentRow,
    }
  }

  // ─── Plot drawing ─────────────────────────────────────────────────────────────

  private drawPlot(plot: Plot) {
    const x   = plot.col * STEP + PLOT_GAP
    const y   = plot.row * STEP + PLOT_GAP
    const cfg = PLOT_TIERS[plot.tier as PlotTier]

    const container = this.add.container(x, y)

    // Generated plot PNG as the base
    const padded  = String(plot.id).padStart(3, '0')
    const plotImg = this.add.image(PLOT_SIZE / 2, PLOT_SIZE / 2, `plot-${padded}`)
    plotImg.setOrigin(0.5)
    plotImg.setDisplaySize(PLOT_SIZE, PLOT_SIZE)

    // Border (tier color) + ownership overlay
    const border = this.add.graphics()
    border.lineStyle(6, cfg.color, 1)
    border.strokeRoundedRect(0, 0, PLOT_SIZE, PLOT_SIZE, 8)
    if (plot.owner_wallet) {
      const col = plot.owner_wallet === this.walletAddress ? 0x00ff88 : 0xff6600
      border.fillStyle(col, 0.12)
      border.fillRoundedRect(0, 0, PLOT_SIZE, PLOT_SIZE, 8)
    }

    // Tier badge — small pill at top-left
    const tierColors: Record<string, string> = {
      bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#00bfff',
    }
    const tierBadge = this.add.text(10, 10, cfg.label.toUpperCase(), {
      fontSize:   '10px',
      fontFamily: '"Press Start 2P"',
      color:      tierColors[plot.tier] ?? '#ffffff',
      backgroundColor: '#00000088',
      padding:    { x: 5, y: 3 },
    }).setOrigin(0, 0)

    // Plot ID — bottom right
    const idText = this.add.text(PLOT_SIZE - 8, PLOT_SIZE - 8, `#${plot.id}`, {
      fontSize: '9px', fontFamily: '"Press Start 2P"', color: '#ffffffaa',
      backgroundColor: '#00000066', padding: { x: 3, y: 2 },
    }).setOrigin(1, 1)

    container.add([plotImg, border, tierBadge, idText])
    this.plotObjects.set(plot.id, container)
  }

  private spawnAnimal(plot: Plot) {
    const types  = ['chicken', 'cow', 'pig', 'sheep'] as const
    const type   = types[Phaser.Math.Between(0, types.length - 1)]
    const plotX  = plot.col * STEP + PLOT_GAP
    const plotY  = plot.row * STEP + PLOT_GAP
    const margin = 80
    const x = plotX + margin + Math.random() * (PLOT_SIZE - margin * 2)
    const y = plotY + margin + Math.random() * (PLOT_SIZE - margin * 2)

    // 64×64 single-frame sprite — scale 1.0 renders at 64 world units
    const spr = this.add.sprite(x, y, type, 0)
    spr.setScale(1.0)
    spr.setDepth(5)

    this.animalSprites.push(spr)
    this.time.delayedCall(Math.random() * 500, () => this.wanderAnimal(spr, plotX, plotY))
  }

  private wanderAnimal(spr: Phaser.GameObjects.Sprite, plotX: number, plotY: number) {
    if (!spr.active) return

    const margin = 60
    const newX   = plotX + margin + Math.random() * (PLOT_SIZE - margin * 2)
    const newY   = plotY + margin + Math.random() * (PLOT_SIZE - margin * 2)
    const dx     = newX - spr.x
    const dist   = Math.sqrt(dx * dx + (newY - spr.y) ** 2)
    const dur    = Math.max(1500, (dist / 30) * 1000)

    // Flip sprite to face direction of travel (single-frame sprites, no walk anim)
    spr.setFlipX(dx < 0)

    this.tweens.add({
      targets:  spr,
      x:        newX,
      y:        newY,
      duration: dur,
      ease:     'Sine.easeInOut',
      onComplete: () => {
        if (!spr.active) return
        this.time.delayedCall(
          Phaser.Math.Between(1500, 5000),
          () => this.wanderAnimal(spr, plotX, plotY),
        )
      },
    })
  }

  // ─── Hired farmer NPCs ────────────────────────────────────────────────────────

  spawnFarmerNPCs(plot: Plot) {
    // Remove any existing farmer sprites for this plot
    const existing = this.farmerSprites.get(plot.id) ?? []
    existing.forEach(s => s.destroy())
    this.farmerSprites.delete(plot.id)

    const count = Math.min(plot.farmer_count ?? 0, 3) // cap at 3 visible
    if (count === 0) return

    const farmerIds = ['farmer-bob', 'farmer-buba']
    const plotX = plot.col * STEP + PLOT_GAP
    const plotY = plot.row * STEP + PLOT_GAP
    const spawned: Phaser.GameObjects.Sprite[] = []

    for (let i = 0; i < count; i++) {
      const texKey = farmerIds[i % farmerIds.length]
      const margin = 80
      const x = plotX + margin + Math.random() * (PLOT_SIZE - margin * 2)
      const y = plotY + margin + Math.random() * (PLOT_SIZE - margin * 2)
      const spr = this.add.sprite(x, y, texKey, 18) // frame 18 = downStart for 6-col sheet
      spr.setScale(1.5)
      spr.setDepth(9) // just below player (10)
      spawned.push(spr)
      this.time.delayedCall(Math.random() * 600, () => this.wanderFarmer(spr, texKey, plotX, plotY))
    }

    this.farmerSprites.set(plot.id, spawned)
  }

  private wanderFarmer(spr: Phaser.GameObjects.Sprite, texKey: string, plotX: number, plotY: number) {
    if (!spr.active) return
    const margin = 60
    const newX   = plotX + margin + Math.random() * (PLOT_SIZE - margin * 2)
    const newY   = plotY + margin + Math.random() * (PLOT_SIZE - margin * 2)
    const dx     = newX - spr.x
    const dist   = Math.sqrt(dx * dx + (newY - spr.y) ** 2)
    const dur    = Math.max(1200, (dist / 35) * 1000)

    // Use right-walk anim and flip for left
    spr.setFlipX(dx < 0)
    if (this.anims.exists(`${texKey}-right`)) spr.play(`${texKey}-right`, true)

    this.tweens.add({
      targets: spr, x: newX, y: newY, duration: dur, ease: 'Linear',
      onComplete: () => {
        if (!spr.active) return
        spr.stop()
        spr.setFrame(18) // idle down pose
        this.time.delayedCall(
          Phaser.Math.Between(2000, 6000),
          () => this.wanderFarmer(spr, texKey, plotX, plotY),
        )
      },
    })
  }

  refreshPlot(plot: Plot) {
    this.plotObjects.get(plot.id)?.destroy()
    this.plotObjects.delete(plot.id)
    this.plots = this.plots.map(p => p.id === plot.id ? plot : p)
    this.drawPlot(plot)
    // Re-sync farmer NPCs (farmer_count may have changed)
    this.spawnFarmerNPCs(plot)
  }

  setWallet(wallet: string | null) {
    this.walletAddress     = wallet
    globalThis.__fw.wallet = wallet
    const snap = [...this.plots]
    snap.forEach(plot => this.refreshPlot(plot))

    if (wallet) {
      const owned = this.plots.find(p => p.owner_wallet === wallet)
      if (owned) this.focusPlot(owned.col, owned.row, false)
    }
  }

  // ─── Player name ──────────────────────────────────────────────────────────

  setPlayerName(name: string) {
    savePlayerName(name)
    this.playerNameTag?.setText(name || 'Farmer')
  }

  // ─── Character switching ───────────────────────────────────────────────────

  setCharacter(id: string) {
    const def = CHARACTER_DEFS.find(c => c.id === id)
    if (!def || !this.player) return
    saveCharacter(id)
    this.currentCharId = id
    const wasMoving = this.player.anims.isPlaying
    const dir       = this.lastDir === 'left' ? 'right' : this.lastDir
    this.player.setTexture(id, def.downStart)
    this.player.setScale(def.scale)
    if (wasMoving) {
      this.player.play(`${id}-${dir}`, true)
      if (this.lastDir === 'left') this.player.setFlipX(true)
    } else {
      this.player.stop()
    }
  }

  // ─── Path decorations ──────────────────────────────────────────────────────

  private spawnPathDecorations() {
    const seed = (n: number) => ((Math.imul(n, 2654435761) >>> 0) / 0xffffffff)

    // Lanterns at internal path intersections
    for (let r = 1; r < WORLD_ROWS; r++) {
      for (let c = 1; c < WORLD_COLS; c++) {
        this.add.image(c * STEP, r * STEP, 'deco-lantern')
          .setScale(2.5).setDepth(3)
      }
    }

    // Flowers scattered along horizontal path strips (deterministic via seed)
    const flowerFrames = [0, 1, 2, 3, 10, 11, 20, 21, 30, 40]
    for (let r = 0; r <= WORLD_ROWS; r++) {
      const pathCY = r * STEP + PLOT_GAP / 2
      for (let c = 0; c < WORLD_COLS; c++) {
        const s = seed(r * 100 + c)
        if (s < 0.55) {
          const x     = c * STEP + PLOT_GAP + 20 + seed(r * 200 + c) * (PLOT_SIZE - 40)
          const frame = flowerFrames[Math.floor(seed(r * 300 + c) * flowerFrames.length)]
          this.add.image(x, pathCY, 'deco-flowers', frame).setScale(2).setDepth(2)
        }
      }
    }

    // Hay bales — occasional, near plot edges along horizontal paths
    for (let r = 0; r <= WORLD_ROWS; r++) {
      for (let c = 0; c < WORLD_COLS; c++) {
        const s = seed(r * 400 + c + 77)
        if (s < 0.18) {
          const x   = c * STEP + PLOT_GAP + 30 + seed(r * 500 + c) * (PLOT_SIZE - 60)
          const y   = r * STEP + PLOT_GAP / 2 + (seed(r * 600 + c) < 0.5 ? -10 : 10)
          const frm = Math.floor(seed(r * 700 + c) * 3)
          this.add.image(x, y, 'deco-hay', frm).setScale(2.5).setDepth(2)
        }
      }
    }
  }
}
