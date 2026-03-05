'use client'

import { useState } from 'react'
import { PLOT_TIERS, WORLD_COLS, WORLD_ROWS } from '@/config/game'
import { getPlotWeather, WEATHER_TYPES } from '@/lib/weather'
import type { Plot } from '@/types'

const TIER_COLORS: Record<string, string> = {
  bronze:  '#cd7f32',
  silver:  '#c0c0c0',
  gold:    '#ffd700',
  diamond: '#00bfff',
}

interface Props {
  plots:      Plot[]
  currentCol: number
  currentRow: number
  onNavigate: (col: number, row: number) => void
  onClose:    () => void
}

export default function MapModal({ plots, currentCol, currentRow, onNavigate, onClose }: Props) {
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null)

  // Build a 2D lookup [row][col] → Plot
  const grid: (Plot | null)[][] = Array.from({ length: WORLD_ROWS }, () =>
    Array<Plot | null>(WORLD_COLS).fill(null)
  )
  for (const plot of plots) {
    if (grid[plot.row]) grid[plot.row][plot.col] = plot
  }

  const handleViewPlot = () => {
    if (!selectedPlot) return
    onNavigate(selectedPlot.col, selectedPlot.row)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        style={{
          fontFamily:    '"Press Start 2P", monospace',
          background:    '#d4a574',
          border:        '4px solid #3a1f0a',
          boxShadow:     'inset 3px 3px 0 #e8c090, inset -3px -3px 0 #8b5a2b, 6px 6px 0 #3a1f0a',
          maxWidth:      '95vw',
          maxHeight:     '95vh',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          background:     '#c8975a',
          borderBottom:   '4px solid #3a1f0a',
          padding:        '8px 14px',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          flexShrink:     0,
          boxShadow:      'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b',
        }}>
          <span style={{ fontSize: 11, color: '#3a1f0a' }}>WORLD MAP</span>

          <div style={{ display: 'flex', gap: 14, fontSize: 7, color: '#5c3317' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, display: 'inline-block', background: 'rgba(0,200,100,0.6)', border: '1px solid #0a5a1f' }} />
              Owned
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, display: 'inline-block', background: '#3a2208', border: '1px solid #5c3317' }} />
              Free
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, display: 'inline-block', border: '2px solid #fff' }} />
              You
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#3a1f0a', color: '#d4a574', border: 'none', cursor: 'pointer',
              padding: '4px 10px', fontFamily: '"Press Start 2P", monospace', fontSize: 10,
            }}
          >X</button>
        </div>

        {/* ── Body: grid + detail panel ── */}
        <div style={{ display: 'flex', overflow: 'hidden', flex: 1 }}>

          {/* Grid */}
          <div style={{ overflowY: 'auto', padding: 12, flexShrink: 0 }}>
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: `repeat(${WORLD_COLS}, 1fr)`,
                gap:                 4,
              }}
            >
              {Array.from({ length: WORLD_ROWS }, (_, row) =>
                Array.from({ length: WORLD_COLS }, (_, col) => {
                  const plot       = grid[row]?.[col]
                  const isCurrent  = row === currentRow && col === currentCol
                  const isSelected = selectedPlot?.row === row && selectedPlot?.col === col
                  const tierColor  = plot ? (TIER_COLORS[plot.tier] ?? '#888') : '#555'
                  const isOwned    = !!plot?.owner_wallet
                  const cfg        = plot ? PLOT_TIERS[plot.tier as keyof typeof PLOT_TIERS] : null
                  const padded     = plot ? String(plot.id).padStart(3, '0') : null

                  return (
                    <button
                      key={`${row}-${col}`}
                      onClick={() => plot && setSelectedPlot(plot)}
                      title={plot ? `Plot #${plot.id} — ${cfg?.label}${isOwned ? ' (Owned)' : ' (Free)'}` : ''}
                      style={{
                        width:      52,
                        height:     52,
                        position:   'relative',
                        overflow:   'hidden',
                        border:     isSelected
                          ? '3px solid #ffd700'
                          : isCurrent
                            ? '2.5px solid #fff'
                            : `2px solid ${tierColor}`,
                        boxShadow:  isSelected
                          ? '0 0 10px rgba(255,215,0,0.7)'
                          : isCurrent
                            ? '0 0 10px rgba(255,255,255,0.7)'
                            : '2px 2px 0 #3a1f0a',
                        cursor:     plot ? 'pointer' : 'default',
                        flexShrink: 0,
                        background: 'none',
                        padding:    0,
                      }}
                    >
                      {padded ? (
                        <img
                          src={`/plots/plot-${padded}.png`}
                          alt=""
                          style={{
                            position:       'absolute',
                            inset:          0,
                            width:          '100%',
                            height:         '100%',
                            objectFit:      'cover',
                            imageRendering: 'pixelated',
                            display:        'block',
                          }}
                        />
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, background: '#2a1a08' }} />
                      )}

                      {isOwned && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,200,100,0.28)' }} />
                      )}

                      {isCurrent && (
                        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(255,255,255,0.9)', background: 'rgba(255,255,255,0.12)' }} />
                      )}

                      {isSelected && !isCurrent && (
                        <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(255,215,0,0.9)' }} />
                      )}

                      {plot && (
                        <span style={{
                          position:   'absolute',
                          bottom:     1,
                          right:      2,
                          fontSize:   '6px',
                          fontWeight: 700,
                          color:      '#fff',
                          textShadow: '1px 1px 0 #000',
                          lineHeight: 1,
                        }}>
                          {plot.id}
                        </span>
                      )}

                      {plot && cfg && (
                        <span style={{
                          position:   'absolute',
                          top:        1,
                          left:       2,
                          fontSize:   '6px',
                          fontWeight: 700,
                          color:      tierColor,
                          textShadow: '1px 1px 0 #000',
                          lineHeight: 1,
                        }}>
                          {cfg.label[0]}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            <p style={{ textAlign: 'center', fontSize: 7, color: '#5c3317', marginTop: 10 }}>
              Click a plot to see details
            </p>
          </div>

          {/* Detail panel */}
          <div style={{
            width:         220,
            flexShrink:    0,
            borderLeft:    '4px solid #3a1f0a',
            background:    '#c8975a',
            display:       'flex',
            flexDirection: 'column',
            overflowY:     'auto',
          }}>
            {selectedPlot ? (
              <PlotDetail
                plot={selectedPlot}
                isCurrent={selectedPlot.col === currentCol && selectedPlot.row === currentRow}
                onView={handleViewPlot}
              />
            ) : (
              <div style={{
                flex:           1,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                padding:        20,
                textAlign:      'center',
                fontSize:       7,
                color:          '#8b5a2b',
                lineHeight:     2,
              }}>
                Select a plot on the map to see its details
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Plot detail side panel ────────────────────────────────────────────────────

function PlotDetail({
  plot, isCurrent, onView,
}: {
  plot:      Plot
  isCurrent: boolean
  onView:    () => void
}) {
  const padded     = String(plot.id).padStart(3, '0')
  const cfg        = PLOT_TIERS[plot.tier as keyof typeof PLOT_TIERS]
  const tierColor  = TIER_COLORS[plot.tier] ?? '#888'
  const weatherKey = getPlotWeather(plot.id)
  const weather    = WEATHER_TYPES[weatherKey] ?? WEATHER_TYPES.sunny

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>

      {/* Large thumbnail — square aspect ratio */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', flexShrink: 0 }}>
        <img
          src={`/plots/plot-${padded}.png`}
          alt={`Plot ${plot.id}`}
          style={{
            position:       'absolute',
            inset:          0,
            width:          '100%',
            height:         '100%',
            objectFit:      'cover',
            imageRendering: 'pixelated',
            display:        'block',
          }}
        />
        <div style={{
          position:   'absolute',
          top:        6,
          left:       6,
          background: '#000000aa',
          padding:    '3px 6px',
          fontSize:   7,
          color:      tierColor,
          fontFamily: '"Press Start 2P", monospace',
        }}>
          {cfg.label.toUpperCase()}
        </div>
        <div style={{
          position:   'absolute',
          bottom:     6,
          right:      6,
          background: '#000000aa',
          padding:    '3px 6px',
          fontSize:   7,
          color:      '#fff',
          fontFamily: '"Press Start 2P", monospace',
        }}>
          #{plot.id}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

        <Row label="STATUS">
          {plot.owner_wallet ? (
            <span style={{ color: '#2d6a4f', fontSize: 7 }}>
              {plot.owner_wallet.slice(0, 6)}...{plot.owner_wallet.slice(-4)}
            </span>
          ) : (
            <span style={{ color: '#3a1f0a' }}>UNCLAIMED</span>
          )}
        </Row>

        <Row label="TIER">
          <span style={{ color: tierColor }}>{cfg.label.toUpperCase()}</span>
        </Row>

        <Row label="SLOTS">
          <span style={{ fontSize: 7, color: '#5c3317' }}>
            {cfg.cropSlots} crops · {cfg.animalSlots} animals
          </span>
        </Row>

        <Row label="WEATHER">
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              display:    'inline-block',
              width:      14,
              height:     14,
              background: weather.color,
              border:     '2px solid #3a1f0a',
              flexShrink: 0,
            }} />
            <span style={{ color: weather.color, fontSize: 7 }}>
              {weather.label.toUpperCase()}
            </span>
          </span>
        </Row>

        <Row label="CROP BONUS">
          <span style={{ color: '#3a1f0a' }}>x{weather.cropBonus.toFixed(1)}</span>
        </Row>

        <Row label="POSITION">
          <span style={{ fontSize: 7, color: '#5c3317' }}>
            ({plot.col + 1}, {plot.row + 1})
          </span>
        </Row>

        {isCurrent ? (
          <div style={{
            marginTop:  4,
            padding:    '8px',
            background: '#5c3317',
            textAlign:  'center',
            fontSize:   7,
            color:      '#d4a574',
            border:     '2px solid #3a1f0a',
          }}>
            YOU ARE HERE
          </div>
        ) : (
          <button
            onClick={onView}
            style={{
              marginTop:  4,
              padding:    '10px 0',
              background: '#3a1f0a',
              color:      '#ffd700',
              border:     'none',
              cursor:     'pointer',
              fontFamily: '"Press Start 2P", monospace',
              fontSize:   9,
              width:      '100%',
              boxShadow:  'inset 1px 1px 0 #5c3317, inset -1px -1px 0 #1a0a00, 3px 3px 0 #000',
            }}
          >
            VIEW PLOT
          </button>
        )}

      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 6, color: '#8b5a2b', letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 8, color: '#3a1f0a' }}>{children}</span>
    </div>
  )
}
