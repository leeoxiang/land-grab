'use client'

import { useEffect, useRef } from 'react'
import type { WorldScene, SceneState } from './WorldScene'
import { PLOT_TIERS, PLOT_SIZE, PLOT_GAP, WORLD_COLS, WORLD_ROWS } from '@/config/game'

const STEP   = PLOT_SIZE + PLOT_GAP

const TIER_COLORS: Record<string, string> = {
  bronze:  '#cd7f32',
  silver:  '#c0c0c0',
  gold:    '#ffd700',
  diamond: '#00bfff',
}

const MAP_W = 184
const MAP_H = 148

interface Props {
  sceneRef:  React.MutableRefObject<import('phaser').Game | null>
  onOpenMap: () => void
}

export default function Minimap({ sceneRef, onOpenMap }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const rafRef     = useRef<number>(0)
  const plotImgs   = useRef<Map<number, HTMLImageElement>>(new Map())
  const imgsLoaded = useRef(false)

  // Preload all 100 plot thumbnails once
  useEffect(() => {
    let loaded = 0
    for (let i = 1; i <= 100; i++) {
      const img = new Image()
      img.src = `/plots/plot-${String(i).padStart(3, '0')}.png`
      img.onload = () => {
        plotImgs.current.set(i, img)
        loaded++
        if (loaded === 100) imgsLoaded.current = true
      }
    }
  }, [])

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current
      if (!canvas) { rafRef.current = requestAnimationFrame(draw); return }

      const scene = sceneRef.current?.scene.getScene('WorldScene') as WorldScene | null
      const state: SceneState | null = scene?.getSceneState?.() ?? null

      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, MAP_W, MAP_H)

      if (!state) {
        ctx.fillStyle = '#1a2e0a'
        ctx.fillRect(0, 0, MAP_W, MAP_H)
        ctx.fillStyle = '#4b5563'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Loading map...', MAP_W / 2, MAP_H / 2)
        rafRef.current = requestAnimationFrame(draw)
        return
      }

      const { worldW, worldH, playerX, playerY, camLeft, camTop, camRight, camBottom, plots, otherPlayers = [] } = state

      // Background (path colour)
      ctx.fillStyle = '#5c3d1e'
      ctx.fillRect(0, 0, MAP_W, MAP_H)

      // Draw each plot as its PNG thumbnail
      for (const plot of plots) {
        const plotLeft = plot.col * STEP + PLOT_GAP
        const plotTop  = plot.row * STEP + PLOT_GAP
        const mx = plotLeft  / worldW * MAP_W
        const my = plotTop   / worldH * MAP_H
        const mw = PLOT_SIZE / worldW * MAP_W
        const mh = PLOT_SIZE / worldH * MAP_H

        const img = plotImgs.current.get(plot.id)
        if (img) {
          ctx.drawImage(img, mx, my, mw, mh)
        } else {
          // Fallback: tier colour while loading
          ctx.fillStyle = TIER_COLORS[plot.tier] ?? '#888'
          ctx.fillRect(mx, my, mw, mh)
        }

        // Ownership tint overlay
        if (plot.owner_wallet) {
          ctx.fillStyle = 'rgba(0,220,100,0.28)'
          ctx.fillRect(mx, my, mw, mh)
        }

        // Tier border
        ctx.strokeStyle = TIER_COLORS[plot.tier] ?? '#888'
        ctx.lineWidth   = 0.6
        ctx.strokeRect(mx, my, mw, mh)
      }

      // Viewport rectangle
      const vx = camLeft  / worldW * MAP_W
      const vy = camTop   / worldH * MAP_H
      const vw = (camRight  - camLeft) / worldW * MAP_W
      const vh = (camBottom - camTop)  / worldH * MAP_H
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth   = 1.5
      ctx.strokeRect(vx, vy, vw, vh)

      // Other player dots (orange)
      for (const op of otherPlayers) {
        const ox = op.x / worldW * MAP_W
        const oy = op.y / worldH * MAP_H
        ctx.beginPath()
        ctx.arc(ox, oy, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#ff8844'
        ctx.fill()
        ctx.strokeStyle = '#000'
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // Player dot (white — drawn last so it's always on top)
      const dotX = playerX / worldW * MAP_W
      const dotY = playerY / worldH * MAP_H
      ctx.beginPath()
      ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#000'
      ctx.lineWidth   = 1
      ctx.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [sceneRef])

  return (
    <div
      className="pixel-panel absolute bottom-14 right-4 z-20 overflow-hidden cursor-pointer group"
      style={{ width: MAP_W, height: MAP_H + 20, padding: 0 }}
      onClick={onOpenMap}
      title="Click to open full map"
    >
      {/* Header bar */}
      <div className="pixel-panel-header absolute top-0 left-0 right-0 flex items-center justify-between px-2 py-0.5 z-10 pointer-events-none">
        <span className="text-xs font-bold" style={{ color: 'var(--ui-text-dark)', letterSpacing: '0.1em' }}>MAP</span>
        <div className="flex gap-2 text-[10px]" style={{ color: 'var(--ui-darkest)' }}>
          <span className="flex items-center gap-1"><span className="w-2 h-2 inline-block" style={{ background: 'rgba(0,220,100,0.7)' }}/> Owned</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 inline-block" style={{ background: '#cd7f32' }}/> Free</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        className="block"
        style={{ marginTop: 20 }}
      />

      {/* Expand hint — shown on hover */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none">
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold px-2 py-1" style={{ color: 'var(--ui-text)', background: 'var(--ui-dark)' }}>
          Open Map
        </span>
      </div>
    </div>
  )
}
