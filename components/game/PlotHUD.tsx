'use client'

import { useState, useEffect } from 'react'
import type { Plot, PlotFull } from '@/types'
import { PLOT_TIERS } from '@/config/game'
import { GAME_TOKEN } from '@/config/token'
import {
  getPlotWeather, WEATHER_TYPES, msUntilWeatherChange, formatCountdown,
} from '@/lib/weather'
import PixelIcon from '@/components/ui/PixelIcon'

interface Props {
  plot:   Plot | null
  detail: PlotFull | null
  myWallet: string | null
}

const TIER_COLOR: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c8c8d8', gold: '#ffd700', diamond: '#00bfff',
}

export default function PlotHUD({ plot, detail, myWallet }: Props) {
  const [countdown, setCountdown] = useState('')
  const [prevPlotId, setPrevPlotId] = useState<number | null>(null)
  const [visible, setVisible] = useState(false)

  // Countdown to next weather change
  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(msUntilWeatherChange()))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // Slide-in animation when plot changes
  useEffect(() => {
    if (!plot) { setVisible(false); return }
    if (plot.id !== prevPlotId) {
      setVisible(false)
      const t = setTimeout(() => { setVisible(true); setPrevPlotId(plot.id) }, 60)
      return () => clearTimeout(t)
    }
  }, [plot, prevPlotId])

  if (!plot) return null

  const cfg        = PLOT_TIERS[plot.tier]
  const tierColor  = TIER_COLOR[plot.tier] ?? '#ffffff'
  const weatherKey = getPlotWeather(plot.id)
  const weather    = WEATHER_TYPES[weatherKey] ?? WEATHER_TYPES.sunny
  const isOwner    = myWallet && plot.owner_wallet === myWallet
  const isFree     = !plot.owner_wallet

  const activeCrops   = detail?.crops.filter(c => !c.harvested).length ?? null
  const animalCount   = detail?.animals.length ?? null
  const farmerCount   = detail?.farmers.length ?? null

  return (
    <div
      style={{
        position:   'absolute',
        top:        12,
        right:      12,
        width:      220,
        zIndex:     20,
        fontFamily: '"Press Start 2P", monospace',
        fontSize:   9,
        transform:  visible ? 'translateX(0)' : 'translateX(240px)',
        opacity:    visible ? 1 : 0,
        transition: 'transform 0.25s cubic-bezier(.22,1,.36,1), opacity 0.2s',
        pointerEvents: 'none',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        background:   '#c8975a',
        border:       '3px solid #3a1f0a',
        borderBottom: 'none',
        padding:      '6px 10px',
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
        boxShadow:    'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b',
      }}>
        <span style={{ color: '#3a1f0a' }}>PLOT #{plot.id}</span>
        <span style={{ color: tierColor, letterSpacing: 1 }}>{cfg.label.toUpperCase()}</span>
      </div>

      {/* ── Weather block ── */}
      <div style={{
        background:  '#d4a574',
        border:      '3px solid #3a1f0a',
        borderTop:   'none',
        borderBottom: 'none',
        padding:     '8px 10px',
        boxShadow:   'inset 2px 0 0 #e8c090, inset -2px 0 0 #8b5a2b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Pixel-art weather colour swatch */}
          <span style={{
            display:      'inline-block',
            width:        20,
            height:       20,
            background:   weather.color,
            border:       '2px solid #3a1f0a',
            boxShadow:    'inset 1px 1px 0 rgba(255,255,255,0.4)',
            flexShrink:   0,
            imageRendering: 'pixelated',
          }} />
          <div>
            <div style={{ color: weather.color, marginBottom: 3 }}>
              {weather.label.toUpperCase()}
            </div>
            <div style={{ color: '#5c3317', fontSize: 8 }}>
              Crops x{weather.cropBonus.toFixed(1)}
            </div>
            <div style={{ color: '#8b5a2b', fontSize: 7, marginTop: 2 }}>
              Changes in {countdown}
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div style={{
        background: '#5c3317',
        border:     '3px solid #3a1f0a',
        borderTop:  'none',
        borderBottom: 'none',
        height:     2,
      }} />

      {/* ── Owner / stats block ── */}
      <div style={{
        background: '#d4a574',
        border:     '3px solid #3a1f0a',
        borderTop:  'none',
        padding:    '8px 10px',
        boxShadow:  'inset 2px 0 0 #e8c090, inset -2px -2px 0 #8b5a2b, 3px 3px 0 #3a1f0a',
      }}>
        {isFree ? (
          <div>
            <div style={{ color: '#3a1f0a', marginBottom: 4 }}>★ UNCLAIMED</div>
            <div style={{ color: '#5c3317', fontSize: 8 }}>
              {cfg.claimCost.toLocaleString()} {GAME_TOKEN.symbol} to claim
            </div>
            <div style={{ color: '#8b5a2b', fontSize: 7, marginTop: 2 }}>
              {cfg.cropSlots} crop · {cfg.animalSlots} animal slots
            </div>
          </div>
        ) : (
          <div>
            <div style={{
              color: isOwner ? '#2d6a4f' : '#7a3b0a',
              marginBottom: 4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {isOwner
                ? '▶ YOUR PLOT'
                : `${plot.owner_wallet!.slice(0, 6)}...${plot.owner_wallet!.slice(-4)}`}
            </div>

            {/* Stats — shown only when detail is loaded for this plot */}
            {activeCrops !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5c3317', fontSize: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <PixelIcon icon="crops"  size={14} /> {activeCrops}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <PixelIcon icon="animal" size={14} /> {animalCount}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <PixelIcon icon="farmer" size={14} /> {farmerCount}
                </span>
              </div>
            ) : (
              <div style={{ color: '#8b5a2b', fontSize: 7 }}>
                Click to view details
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
