'use client'

import { useEffect, useState, useCallback } from 'react'

// globalThis.__fw is declared in WorldScene.ts; reference it via window cast to avoid re-declaration

import { useGameWallet as useWallet } from '@/hooks/useGameWallet'
import { PLOT_TIERS, CROPS, ANIMALS, FARMERS } from '@/config/game'
import type { PlotFull } from '@/types'
import PixelIcon from '@/components/ui/PixelIcon'

interface Props {
  onManagePlot:  (plotId: number) => void
  onVisitPlot?:  (col: number, row: number) => void
  onClose:       () => void
}

const TIER_COLOR: Record<string, string> = {
  bronze: '#cd9060', silver: '#d8d8e8', gold: '#ffd700', diamond: '#88ccff',
}

export default function MyPlotsPanel({ onManagePlot, onVisitPlot, onClose }: Props) {
  const { publicKey } = useWallet()
  const [plots, setPlots]       = useState<PlotFull[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<PlotFull | null>(null)

  const load = useCallback(async () => {
    if (!publicKey) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/player/plots?wallet=${publicKey.toString()}`)
      const data = await res.json()
      setPlots(Array.isArray(data) ? data : [])
      if (data.length) setSelected(data[0])
    } finally {
      setLoading(false)
    }
  }, [publicKey])

  useEffect(() => { load() }, [load])

  if (!publicKey) return null

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="pixel-panel w-[900px] max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-panel-header flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--ui-text-dark)' }}>My Plots</h2>
            <p className="text-sm" style={{ color: 'var(--ui-dark)' }}>
              {plots.length} plot{plots.length !== 1 ? 's' : ''} owned
            </p>
          </div>
          <button onClick={onClose} className="pixel-btn w-10 h-10 flex items-center justify-center text-xl">×</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--ui-dark)' }}>
            Loading your plots...
          </div>
        ) : plots.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: 'var(--ui-dark)' }}>
            <PixelIcon icon="crops" size={32} />
            <p>You don&apos;t own any plots yet.</p>
            <p className="text-sm">Click a plot on the map to claim one!</p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">

            {/* Left — plot list */}
            <div className="w-60 overflow-y-auto shrink-0" style={{ borderRight: '3px solid var(--ui-dark)', background: 'var(--ui-tan-mid)' }}>
              {plots.map(plot => {
                const cfg        = PLOT_TIERS[plot.tier]
                const readyCount = plot.crops.filter(c => new Date(c.harvest_at) <= new Date()).length
                const isSelected = selected?.id === plot.id
                return (
                  <button
                    key={plot.id}
                    onClick={() => setSelected(plot)}
                    className="w-full text-left px-4 py-3"
                    style={{
                      borderBottom: '2px solid var(--ui-brown)',
                      background: isSelected ? 'var(--ui-tan)' : 'transparent',
                      boxShadow: isSelected ? 'inset 2px 0 0 var(--ui-dark)' : 'none',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 shrink-0" style={{ background: TIER_COLOR[plot.tier], border: '2px solid var(--ui-dark)', display: 'inline-block' }} />
                      <span className="font-bold text-sm" style={{ color: 'var(--ui-text-dark)' }}>Plot #{plot.id}</span>
                      {readyCount > 0 && (
                        <span className="ml-auto font-bold px-1.5 py-0.5" style={{ background: '#2d5a1b', color: '#ccffcc', fontSize: 11, border: '2px solid #1a3a0d' }}>
                          {readyCount} ready
                        </span>
                      )}
                    </div>
                    <div className="text-xs flex gap-3" style={{ color: 'var(--ui-dark)' }}>
                      <span style={{ color: TIER_COLOR[plot.tier] }}>{cfg.label}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><PixelIcon icon="crops" size={10} />{plot.crops.length}/{cfg.cropSlots}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><PixelIcon icon="animal" size={10} />{plot.animals.length}/{cfg.animalSlots}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Right — plot detail */}
            {selected && (
              <PlotDetail
                plot={selected}
                onManage={() => { onManagePlot(selected.id); onClose() }}
                onVisit={() => { globalThis.__fw?.focusPlot?.(selected.col, selected.row); onClose() }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PlotDetail({ plot, onManage, onVisit }: { plot: PlotFull; onManage: () => void; onVisit: () => void }) {
  const cfg = PLOT_TIERS[plot.tier]
  const now = new Date()

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: 'var(--ui-tan-light)' }}>
      {/* Plot header */}
      <div className="flex items-start gap-5">
        <PlotVisual plot={plot} />
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="font-bold text-xl" style={{ color: 'var(--ui-text-dark)' }}>
              Plot #{plot.id}
              <span className="ml-2 text-sm font-normal" style={{ color: TIER_COLOR[plot.tier] }}>
                {cfg.label}
              </span>
            </h3>
            <p className="text-sm" style={{ color: 'var(--ui-dark)' }}>
              Position ({plot.col}, {plot.row}) · {cfg.speed}x growth speed
            </p>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-2">
            <StatChip label="Crops"   value={`${plot.crops.length} / ${cfg.cropSlots}`} />
            <StatChip label="Animals" value={`${plot.animals.length} / ${cfg.animalSlots}`} />
            <StatChip label="Farmers" value={`${plot.farmers.length} hired`} />
            <StatChip label="Speed"   value={`${cfg.speed}x`} />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={onManage} className="pixel-btn px-4 py-2 text-sm">
              Manage Plot →
            </button>
            <button
              onClick={onVisit}
              className="pixel-btn px-4 py-2 text-sm"
              style={{ background: '#1a3a5a', borderColor: '#2a5a8a', color: '#88ccff',
                boxShadow: 'inset 1px 1px 0 #2a6aaa, inset -1px -1px 0 #0a1a2a, 2px 2px 0 #050f1a' }}
            >
              Visit Plot →
            </button>
          </div>
        </div>
      </div>

      {/* Crops */}
      {plot.crops.length > 0 && (
        <Section title="Growing Crops">
          {plot.crops.map(crop => {
            const cc       = CROPS[crop.crop_type as keyof typeof CROPS]
            const harvestAt = new Date(crop.harvest_at)
            const ready    = harvestAt <= now
            const msLeft   = Math.max(0, harvestAt.getTime() - now.getTime())
            const mins     = Math.floor(msLeft / 60000)
            const hrs      = Math.floor(mins / 60)
            return (
              <div key={crop.id} className="pixel-inset flex items-center justify-between px-4 py-2.5 mb-2">
                <div className="flex items-center gap-2">
                  <PixelIcon icon="crops" size={14} />
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--ui-text)' }}>{cc?.name ?? crop.crop_type}</div>
                    <div className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>Slot {crop.slot + 1}</div>
                  </div>
                </div>
                {ready ? (
                  <span className="text-xs font-bold px-2 py-1" style={{ background: '#2d5a1b', color: '#7fffb0', border: '2px solid #1a3a0d' }}>
                    ✓ Ready
                  </span>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--ui-tan-light)' }}>
                    {hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`} left
                  </span>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {/* Animals */}
      {plot.animals.length > 0 && (
        <Section title="Animals">
          <div className="grid grid-cols-2 gap-2">
            {plot.animals.map(animal => {
              const ac     = ANIMALS[animal.animal_type as keyof typeof ANIMALS]
              const nextAt = animal.next_harvest ? new Date(animal.next_harvest) : null
              const ready  = nextAt ? nextAt <= now : false
              const msLeft = nextAt ? Math.max(0, nextAt.getTime() - now.getTime()) : 0
              const hrs    = Math.floor(msLeft / 3600000)
              const mins   = Math.floor((msLeft % 3600000) / 60000)
              return (
                <div key={animal.id} className="pixel-inset px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PixelIcon icon="animal" size={14} />
                    <div>
                      <div className="text-sm font-bold" style={{ color: 'var(--ui-text)' }}>{ac?.name ?? animal.animal_type}</div>
                      <div className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>Produces {ac?.produces}</div>
                    </div>
                  </div>
                  {ready ? (
                    <span className="text-xs font-bold" style={{ color: '#7fffb0' }}>Ready!</span>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>
                      {hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* Farmers */}
      {plot.farmers.length > 0 && (
        <Section title="Hired Farmers">
          <div className="flex gap-2 flex-wrap">
            {plot.farmers.map(farmer => {
              const fc = FARMERS[farmer.farmer_type as keyof typeof FARMERS]
              return (
                <div key={farmer.id} className="pixel-inset px-4 py-3 flex items-center gap-2">
                  <PixelIcon icon="farmer" size={14} />
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--ui-text)' }}>{fc?.name}</div>
                    <div className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>{fc?.speed}x speed · Auto-harvesting</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {plot.crops.length === 0 && plot.animals.length === 0 && plot.farmers.length === 0 && (
        <div className="text-center py-6" style={{ color: 'var(--ui-dark)' }}>
          <PixelIcon icon="crops" size={24} style={{ marginBottom: 8 }} />
          <p>This plot is empty — click Manage to start farming!</p>
        </div>
      )}
    </div>
  )
}

function PlotVisual({ plot }: { plot: PlotFull }) {
  const cfg = PLOT_TIERS[plot.tier]
  const now = new Date()
  const totalSlots = cfg.cropSlots

  return (
    <div
      className="shrink-0 w-36 h-36 p-2 grid gap-1"
      style={{
        border: `3px solid ${TIER_COLOR[plot.tier]}`,
        background: '#5c4a1e',
        boxShadow: `inset 2px 2px 0 #3d2f10, inset -2px -2px 0 #2a1f08`,
        gridTemplateColumns: `repeat(${Math.ceil(Math.sqrt(totalSlots))}, 1fr)`,
      }}
    >
      {Array.from({ length: totalSlots }).map((_, i) => {
        const crop  = plot.crops.find(c => c.slot === i)
        const ready = crop && new Date(crop.harvest_at) <= now
        const cc    = crop ? CROPS[crop.crop_type as keyof typeof CROPS] : null
        return (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              background: ready ? '#1a5c2a' : crop ? '#5c3a0e' : '#3d2a08',
              border: '1px solid #2a1a04',
              fontSize: 12,
            }}
            title={cc?.name ?? 'Empty'}
          >
            {cc && (
              <span style={{
                width: 6, height: 6,
                background: ready ? cc.color : '#5c3a0e',
                border: `1px solid ${ready ? cc.color : '#3a1f08'}`,
                display: 'block',
                imageRendering: 'pixelated',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--ui-darkest)' }}>{title}</h4>
      {children}
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="pixel-inset text-xs px-3 py-1.5">
      <span style={{ color: 'var(--ui-tan-light)' }}>{label}: </span>
      <span className="font-bold" style={{ color: 'var(--ui-text)' }}>{value}</span>
    </div>
  )
}
