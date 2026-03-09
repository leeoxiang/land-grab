'use client'

import { useState, useEffect, useCallback } from 'react'
import { useGameWallet as useWallet } from '@/hooks/useGameWallet'
import { useUsdcTransfer } from '@/lib/useUsdcTransfer'
import type { Plot, PlotFull, Tree } from '@/types'
import { PLOT_TIERS, CROPS, ANIMALS, TREES, FARMERS, FISH, FISH_COOLDOWN_MS, GOBLINS, STEAL_CONFIG, FARMER_HARVEST_BASE_MS, UPGRADES, MAX_UPGRADE_LEVEL, RARITY, ITEM_RARITY } from '@/config/game'
import { GAME_TOKEN } from '@/config/token'
import PixelIcon from '@/components/ui/PixelIcon'

/** Rarity badge for items */
function RarityBadge({ type }: { type: string }) {
  const level  = ITEM_RARITY[type]
  if (!level) return null
  const r = RARITY[level]
  return (
    <span style={{
      fontFamily:  '"Press Start 2P", monospace',
      fontSize:    7,
      color:       r.color,
      background:  r.bg,
      border:      `1px solid ${r.color}55`,
      padding:     '1px 4px',
      lineHeight:  1.4,
      flexShrink:  0,
    }}>
      {r.label}
    </span>
  )
}

/** Small pixel-art-style coloured square used instead of emoji */
function ColorDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <span style={{
      display:        'inline-block',
      width:          size,
      height:         size,
      background:     color,
      border:         '1.5px solid rgba(0,0,0,0.45)',
      flexShrink:     0,
      imageRendering: 'pixelated',
      verticalAlign:  'middle',
      marginRight:    4,
    }} />
  )
}

interface PlotSidecar {
  animals:        string[]
  treeCount:      number
  hasBeehive:     boolean
  hasPond:        boolean
  hasWindmill:    boolean
  layout:         string
  score:          number
  tier:           string
}

interface Props {
  plot:       Plot
  detail:     PlotFull | null
  loading:    boolean
  onClose:    () => void
  onUpdate:   (plot: Plot) => void
  goldenHour?: boolean
}

type Tab = 'overview' | 'crops' | 'animals' | 'trees' | 'fishing' | 'farmers' | 'defend'

// ── Reusable progress bar ──────────────────────────────────────────────────────
function ProgressBar({ pct, color = '#7fffb0', label }: { pct: number; color?: string; label?: string }) {
  const clamped = Math.min(1, Math.max(0, pct))
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{
        height:     8,
        background: '#1a1000',
        border:     '2px solid #3a1f0a',
        borderRadius: 0,
        overflow:   'hidden',
      }}>
        <div style={{
          width:      `${clamped * 100}%`,
          height:     '100%',
          background: color,
          transition: 'width 1s linear',
        }} />
      </div>
      {label && <div style={{ fontSize: 7, color: '#8b5a2b', marginTop: 2 }}>{label}</div>}
    </div>
  )
}

function fmtCountdown(ms: number): string {
  if (ms <= 0) return 'Ready!'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function PlotModal({ plot, detail, loading, onClose, onUpdate, goldenHour = false }: Props) {
  const { publicKey } = useWallet()
  const { transferUsdc } = useUsdcTransfer()
  const [tab, setTab]           = useState<Tab>('overview')
  const [claiming, setClaiming]       = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [sidecar, setSidecar]         = useState<PlotSidecar | null>(null)
  const [now, setNow]                 = useState(Date.now())
  const [localDetail, setLocalDetail] = useState<PlotFull | null>(detail)
  // Rename state
  const [renaming, setRenaming]       = useState(false)
  const [nameInput, setNameInput]     = useState(plot.custom_name ?? '')
  const [renameErr, setRenameErr]     = useState<string | null>(null)
  // Upgrade state
  const [upgrading, setUpgrading]     = useState(false)
  // View count
  const [viewCount, setViewCount]     = useState(plot.view_count ?? 0)
  // Trade listing
  const [listPrice, setListPrice]     = useState('')
  const [listing,   setListing]       = useState(false)
  const [tradeErr,  setTradeErr]      = useState<string | null>(null)
  const [tradeOk,   setTradeOk]       = useState(false)

  // Sync when parent passes fresh data
  useEffect(() => { setLocalDetail(detail) }, [detail])

  // Called by any tab after a write action to fetch fresh data
  const refresh = useCallback(async () => {
    try {
      const res  = await fetch(`/api/plots/${plot.id}`)
      const data = await res.json()
      setLocalDetail(data)
    } catch { /* ignore */ }
  }, [plot.id])

  const cfg           = PLOT_TIERS[plot.tier]
  // Prefer freshly-fetched detail over stale prop — avoids showing Claim on plots just claimed by others
  const effectiveOwner = detail?.owner_wallet ?? plot.owner_wallet
  const isOwner        = !!(publicKey && effectiveOwner === publicKey.toString())
  const isFree         = !effectiveOwner

  // Live clock — tick every second so progress bars animate
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Load plot sidecar JSON
  useEffect(() => {
    const padded = String(plot.id).padStart(3, '0')
    fetch(`/plots/plot-${padded}.json`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSidecar(d))
      .catch(() => {})
  }, [plot.id])

  // Increment view count when modal opens
  useEffect(() => {
    fetch('/api/plots/view', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ plotId: plot.id }),
    })
      .then(r => r.json())
      .then(d => { if (d.view_count) setViewCount(d.view_count) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plot.id])

  const handleClaim = async () => {
    if (!publicKey) return
    setClaiming(true); setError(null)
    try {
      let txSignature: string | undefined

      // Real USDC payment (skipped in DEV_BYPASS mode — detected by 0 cost config)
      if (cfg.claimCost > 0) {
        try {
          txSignature = await transferUsdc(cfg.claimCost)
        } catch (txErr: unknown) {
          // If treasury not configured, allow bypass (for dev/testing)
          const msg = txErr instanceof Error ? txErr.message : ''
          if (!msg.includes('not configured')) throw txErr
        }
      }

      const res  = await fetch('/api/plots/claim', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId: plot.id, wallet: publicKey.toString(), txSignature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to claim')
      onUpdate(data.plot)

      // Fire achievement events
      if (data.newAchievements?.length > 0) {
        window.dispatchEvent(new CustomEvent('farm:event', {
          detail: { achievementIds: data.newAchievements },
        }))
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setClaiming(false)
    }
  }

  const handleAbandon = async () => {
    if (!publicKey || !isOwner) return
    if (!confirm('Abandon this plot? Your locked tokens will be returned.')) return
    setClaiming(true); setError(null)
    try {
      const res  = await fetch('/api/plots/abandon', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId: plot.id, wallet: publicKey.toString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to abandon')
      onUpdate(data.plot)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setClaiming(false)
    }
  }

  const handleRename = async () => {
    if (!publicKey) return
    setRenameErr(null)
    try {
      const res = await fetch('/api/plots/rename', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId: plot.id, wallet: publicKey.toString(), name: nameInput }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to rename')
      onUpdate({ ...plot, custom_name: data.name })
      setRenaming(false)
    } catch (e: unknown) {
      setRenameErr(e instanceof Error ? e.message : 'Failed')
    }
  }

  const handleUpgrade = async () => {
    if (!publicKey) return
    setUpgrading(true); setError(null)
    try {
      const res  = await fetch('/api/plots/upgrade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId: plot.id, wallet: publicKey.toString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upgrade')
      onUpdate({ ...plot, upgrade_level: data.upgrade_level })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setUpgrading(false)
    }
  }

  const handleShare = () => {
    const padded = String(plot.id).padStart(3, '0')
    const a = document.createElement('a')
    a.href = `/plots/plot-${padded}.png`
    a.download = `landgrab-plot-${plot.id}.png`
    a.click()
  }

  const handleListTrade = async () => {
    if (!publicKey) return
    const price = parseFloat(listPrice)
    if (!price || price <= 0) { setTradeErr('Enter a valid price'); return }
    setListing(true); setTradeErr(null); setTradeOk(false)
    try {
      const res  = await fetch('/api/trades', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId: plot.id, sellerWallet: publicKey.toString(), priceUsdc: price }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to list')
      setTradeOk(true)
      setListPrice('')
    } catch (e: unknown) {
      setTradeErr(e instanceof Error ? e.message : 'Failed')
    } finally {
      setListing(false)
    }
  }

  const effectiveMultiplier = (() => {
    const lvl = plot.upgrade_level ?? 1
    const base = lvl >= 4 ? 2.0 : lvl === 3 ? 1.5 : lvl === 2 ? 1.25 : 1.0
    return goldenHour ? base * 1.2 : base
  })()


  const tierColorMap: Record<string, string> = {
    bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#00bfff',
  }

  const tierColor: Record<string, string> = {
    bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#00bfff',
  }

  // Which tabs to show for owners
  const ownerTabs: Tab[] = [
    'overview', 'crops', 'animals',
    ...(localDetail?.trees?.length || sidecar?.treeCount ? ['trees'] as Tab[] : []),
    ...(sidecar?.hasPond ? ['fishing'] as Tab[] : []),
    'farmers', 'defend',
  ]

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50" onClick={onClose}>
      <div
        className="pixel-panel w-[620px] max-w-[96vw] max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-panel-header flex items-center justify-between p-4" style={{ gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {renaming ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
                  maxLength={32}
                  autoFocus
                  placeholder="Plot name..."
                  style={{
                    fontFamily: '"Press Start 2P", monospace', fontSize: 10,
                    background: '#1a0a00', border: '2px solid #8b5a2b',
                    color: '#f0d080', padding: '4px 8px', flex: 1, minWidth: 120,
                  }}
                />
                <button onClick={handleRename} className="pixel-btn" style={{ fontSize: 9, padding: '4px 10px' }}>Save</button>
                <button
                  onClick={() => { setRenaming(false); setNameInput(plot.custom_name ?? '') }}
                  className="pixel-btn" style={{ fontSize: 9, padding: '4px 8px', background: '#8b2a2a', borderColor: '#5c1a1a' }}
                >×</button>
                {renameErr && <span style={{ fontSize: 8, color: '#ff6644', width: '100%' }}>{renameErr}</span>}
              </div>
            ) : (
              <>
                <h2 className="font-bold text-lg" style={{ color: 'var(--ui-text-dark)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>
                    {nameInput.trim() || `Plot #${plot.id}`}
                  </span>
                  <span>—</span>
                  <span style={{ color: tierColor[plot.tier] }}>{cfg.label}</span>
                  {(plot.upgrade_level ?? 1) > 1 && (
                    <span style={{ fontSize: 9, color: '#88ccff' }}>Lv.{plot.upgrade_level}</span>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setRenaming(true)}
                      title="Rename plot"
                      style={{ fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', color: '#8b5a2b', padding: 0 }}
                    >✎</button>
                  )}
                </h2>
                <p className="text-sm flex items-center gap-2" style={{ color: 'var(--ui-dark)' }}>
                  <span style={{ fontSize: 9, color: '#5c3317' }}>👁 {viewCount} views</span>
                  {goldenHour && <span style={{ fontSize: 8, color: '#ffd700', fontFamily: '"Press Start 2P", monospace' }}>✨ GOLDEN HOUR</span>}
                </p>
                <p className="text-sm" style={{ color: 'var(--ui-dark)' }}>
                  {effectiveOwner
                    ? isOwner ? 'Your plot' : `Owned by ${effectiveOwner.slice(0, 6)}...`
                    : `Free · ${cfg.claimCost.toLocaleString()} ${GAME_TOKEN.symbol} to claim`}
                </p>
              </>
            )}
          </div>
          <button onClick={onClose} className="pixel-btn w-10 h-10 flex items-center justify-center text-xl" style={{ flexShrink: 0 }}>×</button>
        </div>

        {/* Tabs — only for owners */}
        {isOwner && (
          <div
            style={{
              display:         'flex',
              overflowX:       'auto',
              borderBottom:    '3px solid var(--ui-dark)',
              scrollbarWidth:  'none',
              flexShrink:      0,
            }}
          >
            {ownerTabs.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pixel-tab capitalize ${tab === t ? 'active' : ''}`}
                style={{
                  flexShrink:  0,
                  padding:     '8px 14px',
                  fontSize:    10,
                  whiteSpace:  'nowrap',
                }}
              >
                {t === 'defend' ? <>defend <span style={{ fontSize: 8, opacity: 0.7 }}>(soon)</span></> : t}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--ui-tan-light)' }}>
          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--ui-dark)' }}>Loading...</div>
          ) : (
            <>
              {/* Overview tab or non-owner view */}
              {(!isOwner || tab === 'overview') && (
                <OverviewTab
                  plot={plot} detail={localDetail} sidecar={sidecar}
                  isOwner={!!isOwner} isFree={isFree} tierColor={tierColor}
                  cfg={cfg} wallet={publicKey?.toString() ?? null}
                />
              )}

              {/* Upgrade section (owner, overview tab) */}
              {isOwner && tab === 'overview' && (
                <UpgradeSection
                  level={plot.upgrade_level ?? 1}
                  upgrading={upgrading}
                  onUpgrade={handleUpgrade}
                />
              )}

              {isOwner && tab === 'crops'   && <CropsTab   plotId={plot.id} detail={localDetail} tier={plot.tier} now={now} onRefresh={refresh} />}
              {isOwner && tab === 'animals' && <AnimalsTab  plotId={plot.id} detail={localDetail} tier={plot.tier} now={now} onRefresh={refresh} />}
              {isOwner && tab === 'trees'   && <TreesTab    plotId={plot.id} detail={localDetail} tier={plot.tier} now={now} onRefresh={refresh} />}
              {isOwner && tab === 'fishing' && <FishingTab  plotId={plot.id} plot={plot} now={now} />}
              {isOwner && tab === 'farmers' && <FarmersTab  plotId={plot.id} detail={localDetail} onRefresh={refresh} />}
              {isOwner && tab === 'defend'  && (
                <div className="text-center py-10" style={{ color: 'var(--ui-dark)', fontSize: 13 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🛡️</div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Goblin Defenders</div>
                  <div style={{ opacity: 0.6 }}>Coming Soon</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 space-y-2" style={{ borderTop: '3px solid var(--ui-dark)', background: 'var(--ui-tan)' }}>
          {error && <p className="text-sm text-center" style={{ color: '#ff6644' }}>{error}</p>}

          {isFree && publicKey && (
            <button onClick={handleClaim} disabled={claiming} className="pixel-btn w-full py-3">
              {claiming ? 'Claiming...' : `Claim for ${cfg.claimCost.toLocaleString()} ${GAME_TOKEN.symbol}`}
            </button>
          )}

          {!publicKey && isFree && (
            <p className="text-center text-sm" style={{ color: 'var(--ui-dark)', opacity: 0.6 }}>Wallet required to claim</p>
          )}

          {/* Steal button for non-owner occupied plots */}
          {!isFree && !isOwner && publicKey && (
            <div className="pixel-inset p-3 text-center" style={{ fontSize: 11, opacity: 0.6 }}>
              Raid mechanic — Coming Soon
            </div>
          )}

          {/* Share card button */}
          {effectiveOwner && (
            <button
              onClick={handleShare}
              className="pixel-btn w-full py-2 text-sm"
              style={{ background: '#1a3a6a', borderColor: '#0d1f40', color: '#88ccff' }}
            >
              Download Plot Card
            </button>
          )}

          {/* Trade listing for owner */}
          {isOwner && (
            <div className="pixel-inset p-3 space-y-2">
              <div style={{ fontSize: 9, color: 'var(--ui-text-dark)', fontFamily: '"Press Start 2P", monospace' }}>
                List for Trade
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  value={listPrice}
                  onChange={e => setListPrice(e.target.value)}
                  placeholder="Price (USDC)"
                  min="0.01"
                  step="0.01"
                  className="pixel-input flex-1"
                  style={{ fontSize: 10 }}
                />
                <button
                  onClick={handleListTrade}
                  disabled={listing || !listPrice}
                  className="pixel-btn px-4 py-1"
                  style={{ fontSize: 9, background: '#5a4a00', color: '#ffd700', borderColor: '#2a2000' }}
                >
                  {listing ? '…' : 'List'}
                </button>
              </div>
              {tradeErr && <div style={{ fontSize: 9, color: '#ff4444' }}>{tradeErr}</div>}
              {tradeOk  && <div style={{ fontSize: 9, color: '#7fffb0' }}>Listed! Buyers can find it in Plot Trading.</div>}
            </div>
          )}

          {isOwner && (
            <button
              onClick={handleAbandon} disabled={claiming}
              className="pixel-btn w-full py-2 text-sm"
              style={{ background: '#8b2a2a', borderColor: '#5c1a1a', color: '#ffcccc' }}
            >
              Abandon plot (reclaim {cfg.claimCost.toLocaleString()} {GAME_TOKEN.symbol})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Overview tab ───────────────────────────────────────────────────────────────

function OverviewTab({
  plot, detail, sidecar, isOwner, isFree, tierColor, cfg, wallet,
}: {
  plot: Plot; detail: PlotFull | null; sidecar: PlotSidecar | null
  isOwner: boolean; isFree: boolean
  tierColor: Record<string, string>; cfg: typeof PLOT_TIERS[keyof typeof PLOT_TIERS]
  wallet: string | null
}) {
  return (
    <div className="space-y-3">
      {/* Plot preview */}
      <div className="pixel-inset overflow-hidden" style={{ height: 160, position: 'relative' }}>
        <img
          src={`/plots/plot-${String(plot.id).padStart(3, '0')}.png`}
          alt={`Plot #${plot.id}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
        />
        {sidecar?.score != null && (
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.65)', padding: '2px 7px',
            fontSize: 9, fontFamily: '"Press Start 2P", monospace',
            color: tierColor[plot.tier], border: `2px solid ${tierColor[plot.tier]}`,
          }}>
            ★ {sidecar.score}{sidecar.layout ? ` · ${sidecar.layout.replace(/_/g, ' ')}` : ''}
          </div>
        )}
        {/* Feature badges */}
        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
          {sidecar?.hasPond     && <Badge color="#1e90ff">POND</Badge>}
          {sidecar?.hasWindmill && <Badge color="#c8a060">MILL</Badge>}
          {sidecar?.hasBeehive  && <Badge color="#ffd700">HIVE</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <Stat label="Tier"        value={cfg.label} />
        <Stat label="Speed"       value={`${cfg.speed}x`} />
        <Stat label="Crop Slots"  value={cfg.cropSlots} />
        <Stat label="Animal Slots" value={cfg.animalSlots} />
        <Stat label="Claim Cost"  value={`${cfg.claimCost.toLocaleString()} ${GAME_TOKEN.symbol}`} />
        <Stat label="Position"    value={`${plot.col + 1}, ${plot.row + 1}`} />
      </div>

      {/* Included animals for unclaimed plot */}
      {isFree && sidecar?.animals && sidecar.animals.length > 0 && (
        <div className="pixel-inset p-3">
          <div className="text-xs mb-1" style={{ color: 'var(--ui-tan-light)' }}>Included on claim</div>
          <div className="flex gap-2 flex-wrap">
            {sidecar.animals.map((a, i) => {
              const ac = ANIMALS[a as keyof typeof ANIMALS]
              return ac ? (
                <span key={i} className="text-sm" style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}>
                  <PixelIcon icon="animal" size={12} style={{ marginRight: 4 }} />{ac.name}
                </span>
              ) : null
            })}
          </div>
        </div>
      )}

      {/* Owner stats */}
      {isOwner && detail && (
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-sm">
          <StatBox value={detail.crops.filter(c => !c.harvested).length} label="Crops" color="#7fffb0" />
          <StatBox value={detail.animals.length}                          label="Animals" color="#ffd700" />
          <StatBox value={detail.trees?.length ?? 0}                     label="Trees"   color="#90ee90" />
          <StatBox value={detail.farmers.length}                          label="Farmers" color="#88ccff" />
        </div>
      )}
    </div>
  )
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      background: 'rgba(0,0,0,0.7)', border: `1.5px solid ${color}`,
      color, fontSize: 8, padding: '2px 5px',
      fontFamily: '"Press Start 2P", monospace',
    }}>
      {children}
    </span>
  )
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="pixel-inset rounded p-2">
      <div className="font-bold" style={{ color }}>{value}</div>
      <div style={{ color: 'var(--ui-text)', fontSize: 9 }}>{label}</div>
    </div>
  )
}

// ── Crops tab ──────────────────────────────────────────────────────────────────

function CropsTab({ plotId, detail, tier, now, onRefresh }: { plotId: number; detail: PlotFull | null; tier: string; now: number; onRefresh: () => Promise<void> }) {
  const { publicKey } = useWallet()
  const [planting, setPlanting] = useState(false)
  const cfg = PLOT_TIERS[tier as keyof typeof PLOT_TIERS]

  const plantCrop = async (cropType: string, slot: number) => {
    if (!publicKey) return
    setPlanting(true)
    try {
      const res  = await fetch('/api/crops/plant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId, slot, cropType, wallet: publicKey.toString() }),
      })
      const data = await res.json()
      // Schedule browser notification
      if (data.crop?.harvest_at) {
        const readyAtMs = new Date(data.crop.harvest_at).getTime()
        window.dispatchEvent(new CustomEvent('farm:event', {
          detail: { label: `${cropType} crop`, readyAtMs },
        }))
      }
      await onRefresh()
    } finally {
      setPlanting(false)
    }
  }

  const harvestCrop = async (cropId: string) => {
    if (!publicKey) return
    const res  = await fetch('/api/crops/harvest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ cropId, wallet: publicKey.toString() }),
    })
    const data = await res.json()
    if (data.newAchievements?.length > 0) {
      window.dispatchEvent(new CustomEvent('farm:event', {
        detail: { achievementIds: data.newAchievements },
      }))
    }
    await onRefresh()
  }

  const activeCrops = detail?.crops.filter(c => !c.harvested) ?? []

  return (
    <div className="space-y-4">
      {activeCrops.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>Growing</h3>
          <div className="space-y-3">
            {activeCrops.map(crop => {
              const cropCfg   = CROPS[crop.crop_type]
              const plantedAt = new Date(crop.planted_at).getTime()
              const harvestAt = new Date(crop.harvest_at).getTime()
              const total     = harvestAt - plantedAt
              const elapsed   = now - plantedAt
              const pct       = Math.min(1, elapsed / total)
              const ready     = now >= harvestAt
              const timeLeft  = Math.max(0, harvestAt - now)

              return (
                <div key={crop.id} className="pixel-inset p-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ColorDot color={cropCfg.color} />{cropCfg.name}
                      <RarityBadge type={crop.crop_type} />
                      <span style={{ fontSize: 9, color: 'var(--ui-dark)' }}>(slot {crop.slot + 1})</span>
                    </span>
                    {ready ? (
                      <button onClick={() => harvestCrop(crop.id)} className="pixel-btn text-xs px-3 py-1">
                        Harvest
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>{fmtCountdown(timeLeft)}</span>
                    )}
                  </div>
                  <ProgressBar pct={pct} color={ready ? '#ffd700' : '#7fffb0'} label={ready ? '✓ Ready to harvest!' : `${Math.floor(pct * 100)}% grown`} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plant new */}
      <div>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>
          Plant (Slot {activeCrops.length + 1}/{cfg.cropSlots})
        </h3>
        {activeCrops.length >= cfg.cropSlots ? (
          <p className="text-sm" style={{ color: 'var(--ui-dark)' }}>All slots occupied</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CROPS).map(([key, c]) => (
              <button
                key={key}
                disabled={planting}
                onClick={() => plantCrop(key, activeCrops.length)}
                className="pixel-inset text-left p-3 hover:brightness-110 transition-all"
              >
                <div className="text-sm" style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ColorDot color={c.color} />{c.name} <RarityBadge type={key} />
                </div>
                <div className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>
                  Cost: {c.seedCost} | Sell: {c.sellPrice} | {Math.floor(c.growMs / 60000)}m grow
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Animals tab ────────────────────────────────────────────────────────────────

function AnimalsTab({ plotId, detail, tier, now, onRefresh }: { plotId: number; detail: PlotFull | null; tier: string; now: number; onRefresh: () => Promise<void> }) {
  const { publicKey } = useWallet()
  const { transferUsdc } = useUsdcTransfer()
  const [buying, setBuying] = useState(false)
  const [buyErr, setBuyErr] = useState<string | null>(null)
  const cfg = PLOT_TIERS[tier as keyof typeof PLOT_TIERS]

  const buyAnimal = async (animalType: string) => {
    if (!publicKey || buying) return
    setBuying(true); setBuyErr(null)
    try {
      // 1. Preflight — validate server-side BEFORE opening Phantom
      const pre = await fetch(
        `/api/animals/buy?plotId=${plotId}&animalType=${animalType}&wallet=${publicKey.toString()}`
      )
      const preData = await pre.json()
      if (!pre.ok) throw new Error(preData.error || 'Cannot buy animal')

      // 2. Payment — only reached if preflight passed
      let txSignature: string | undefined
      try {
        txSignature = await transferUsdc(preData.cost ?? 1)
      } catch (txErr: unknown) {
        const msg = txErr instanceof Error ? txErr.message : ''
        if (!msg.includes('not configured')) throw txErr
        // treasury not configured — dev bypass
      }

      // 3. Commit with verified signature
      const res  = await fetch('/api/animals/buy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId, animalType, wallet: publicKey.toString(), txSignature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to buy animal')

      // Spawn the new animal sprite immediately in Phaser
      globalThis.__fw?.refreshAnimals?.(plotId, animalType)

      await onRefresh()
    } catch (e: unknown) {
      setBuyErr(e instanceof Error ? e.message : 'Failed to buy animal')
    } finally {
      setBuying(false)
    }
  }

  const harvestAnimal = async (animalId: string) => {
    if (!publicKey) return
    await fetch('/api/animals/harvest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ animalId, wallet: publicKey.toString() }),
    })
    await onRefresh()
  }

  const activeAnimals = detail?.animals ?? []

  return (
    <div className="space-y-4">
      {activeAnimals.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>Your Animals</h3>
          <div className="space-y-3">
            {activeAnimals.map(a => {
              const ac          = ANIMALS[a.animal_type]
              const purchasedAt = new Date(a.purchased_at).getTime()
              const nextHarvest = new Date(a.next_harvest).getTime()
              const lastHarvest = a.last_harvest ? new Date(a.last_harvest).getTime() : purchasedAt
              const total       = ac.harvestMs
              const elapsed     = now - lastHarvest
              const pct         = Math.min(1, elapsed / total)
              const ready       = now >= nextHarvest
              const timeLeft    = Math.max(0, nextHarvest - now)

              return (
                <div key={a.id} className="pixel-inset p-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}><PixelIcon icon="animal" size={12} style={{ marginRight: 4 }} />{ac.name}</span>
                    {ready ? (
                      <button onClick={() => harvestAnimal(a.id)} className="pixel-btn text-xs px-3 py-1">
                        Collect {ac.produces}
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>{fmtCountdown(timeLeft)}</span>
                    )}
                  </div>
                  <ProgressBar pct={pct} color={ready ? '#ffd700' : '#88ccff'} label={ready ? `✓ ${ac.produces} ready!` : `${Math.floor(pct * 100)}% · yields ${ac.yield} ${ac.produces}`} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>
          Buy Animal ({activeAnimals.length}/{cfg.animalSlots})
        </h3>
        {buyErr && <p className="text-xs mb-2" style={{ color: '#ff6666' }}>{buyErr}</p>}
        {activeAnimals.length >= cfg.animalSlots ? (
          <p className="text-sm" style={{ color: 'var(--ui-dark)' }}>Animal slots full</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ANIMALS).map(([key, a]) => (
              <button key={key} onClick={() => buyAnimal(key)} disabled={buying}
                className="pixel-inset text-left p-3 hover:brightness-110 transition-all"
                style={{ opacity: buying ? 0.6 : 1 }}>
                <div className="text-sm" style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}><PixelIcon icon="animal" size={12} style={{ marginRight: 4 }} />{a.name}</div>
                <div className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>
                  {a.cost} USDC · {a.produces} / {a.harvestMs >= 3600000 ? `${a.harvestMs / 3600000}h` : `${a.harvestMs / 60000}m`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Trees tab ──────────────────────────────────────────────────────────────────

// Slot positions shown as a mini grid (3×2)
const SLOT_LABELS = ['Top-Left', 'Top-Center', 'Top-Right', 'Bot-Left', 'Bot-Center', 'Bot-Right']

function SlotPicker({ usedSlots, onPick }: { usedSlots: number[]; onPick: (slot: number) => void }) {
  return (
    <div>
      <div className="text-xs mb-2" style={{ color: 'var(--ui-dark)', fontFamily: '"Press Start 2P", monospace', fontSize: 8 }}>
        PICK A SPOT ON YOUR PLOT:
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
        {SLOT_LABELS.map((label, i) => {
          const taken = usedSlots.includes(i)
          return (
            <button key={i} disabled={taken} onClick={() => onPick(i)}
              className="pixel-btn"
              style={{ fontSize: 7, padding: '6px 4px', opacity: taken ? 0.35 : 1, cursor: taken ? 'not-allowed' : 'pointer' }}
              title={taken ? 'Occupied' : label}
            >
              {taken ? 'X' : label.replace('-', '\n')}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TreesTab({ plotId, detail, tier, now, onRefresh }: { plotId: number; detail: PlotFull | null; tier: string; now: number; onRefresh: () => Promise<void> }) {
  const { publicKey } = useWallet()
  const [planting,        setPlanting]        = useState(false)
  const [pendingTreeType, setPendingTreeType] = useState<string | null>(null)
  const MAX_TREES = 3

  const plantTree = async (treeType: string, slot: number) => {
    if (!publicKey) return
    setPlanting(true)
    setPendingTreeType(null)
    try {
      const res = await fetch('/api/trees/plant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId, treeType, wallet: publicKey.toString(), slot }),
      })
      if (res.ok) {
        const { tree } = await res.json()
        // Add sprite to Phaser scene immediately
        globalThis.__fw?.addTreeSprite?.(tree.id, plotId, treeType, slot)
      }
      await onRefresh()
    } finally {
      setPlanting(false)
    }
  }

  const harvestTree = async (treeId: string) => {
    if (!publicKey) return
    const res = await fetch('/api/trees/harvest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ treeId, wallet: publicKey.toString() }),
    })
    if (res.ok) {
      // Remove sprite from Phaser scene immediately
      globalThis.__fw?.removeTreeSprite?.(treeId)
    }
    await onRefresh()
  }

  const trees = detail?.trees ?? []
  const usedSlots = trees.map((t: Tree) => t.slot ?? -1)

  return (
    <div className="space-y-4">
      {trees.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>Your Trees</h3>
          <div className="space-y-3">
            {trees.map((tree: Tree) => {
              const tc        = TREES[tree.tree_type as keyof typeof TREES]
              if (!tc) return null
              const plantedAt = new Date(tree.planted_at).getTime()
              const readyAt   = new Date(tree.ready_at).getTime()
              const grown     = now >= readyAt

              if (!grown) {
                const total   = readyAt - plantedAt
                const elapsed = now - plantedAt
                const pct     = Math.min(1, elapsed / total)
                return (
                  <div key={tree.id} className="pixel-inset p-3">
                    <div className="flex items-center justify-between">
                      <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}><ColorDot color={tc.color} />{tc.name} — Growing</span>
                      <span className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>{fmtCountdown(readyAt - now)}</span>
                    </div>
                    <ProgressBar pct={pct} color="#90ee90" label={`${Math.floor(pct * 100)}% grown`} />
                  </div>
                )
              }

              const nextHarvest = tree.next_harvest != null ? new Date(tree.next_harvest).getTime() : 0
              const lastHarvest = tree.last_harvest  != null ? new Date(tree.last_harvest).getTime()  : readyAt
              const canHarvest  = now >= nextHarvest
              const total       = tc.harvestMs
              const elapsed     = now - lastHarvest
              const pct         = Math.min(1, elapsed / total)

              return (
                <div key={tree.id} className="pixel-inset p-3">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}><ColorDot color={tc.color} />{tc.name}</span>
                    {canHarvest ? (
                      <button onClick={() => harvestTree(tree.id)} className="pixel-btn text-xs px-3 py-1">
                        Harvest {tc.yield} fruit
                      </button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>{fmtCountdown(nextHarvest - now)}</span>
                    )}
                  </div>
                  <ProgressBar pct={pct} color={canHarvest ? '#ffd700' : '#90ee90'} label={canHarvest ? 'Fruit ready!' : `${Math.floor(pct * 100)}% · yields ${tc.yield} fruit`} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>
          Plant Tree ({trees.length}/{MAX_TREES})
        </h3>
        {trees.length >= MAX_TREES ? (
          <p className="text-sm" style={{ color: 'var(--ui-dark)' }}>Max trees reached</p>
        ) : pendingTreeType ? (
          <div className="space-y-3">
            <div className="text-xs" style={{ color: 'var(--ui-darkest)' }}>
              Planting: <strong>{TREES[pendingTreeType as keyof typeof TREES]?.name}</strong>
            </div>
            <SlotPicker usedSlots={usedSlots} onPick={slot => plantTree(pendingTreeType, slot)} />
            <button onClick={() => setPendingTreeType(null)} className="pixel-btn" style={{ fontSize: 8, padding: '4px 10px' }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(TREES).map(([key, t]) => (
              <button key={key} disabled={planting}
                onClick={() => setPendingTreeType(key)}
                className="pixel-inset w-full text-left p-3 hover:brightness-110 transition-all">
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}><ColorDot color={t.color} />{t.name}</span>
                  <span style={{ color: '#ffd700', fontSize: 11 }}>{t.cost.toLocaleString()}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--ui-tan-light)' }}>
                  Grows in {t.growMs / 3600000}h · Harvest {t.yield} fruit every {t.harvestMs / 3600000}h
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Fishing tab ────────────────────────────────────────────────────────────────

function FishingTab({ plotId, plot, now }: { plotId: number; plot: Plot; now: number }) {
  const { publicKey } = useWallet()
  const [casting, setCasting]     = useState(false)
  const [lastCatch, setLastCatch] = useState<{ fishType: string; qty: number } | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [cooldownEnd, setCooldownEnd] = useState<number>(
    plot.last_fish_at ? new Date(plot.last_fish_at as unknown as string).getTime() + FISH_COOLDOWN_MS : 0
  )

  const canFish = now >= cooldownEnd
  const timeLeft = Math.max(0, cooldownEnd - now)
  const pct = cooldownEnd > 0 ? Math.min(1, (now - (cooldownEnd - FISH_COOLDOWN_MS)) / FISH_COOLDOWN_MS) : 1

  const castLine = useCallback(async () => {
    if (!publicKey || casting) return
    setCasting(true); setError(null); setLastCatch(null)
    try {
      const res  = await fetch('/api/fish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId, wallet: publicKey.toString() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Fishing failed')
      setLastCatch({ fishType: data.fishType, qty: data.qty })
      setCooldownEnd(Date.now() + FISH_COOLDOWN_MS)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setCasting(false)
    }
  }, [publicKey, casting, plotId])

  const tierLuck: Record<string, string> = {
    bronze: '+0%', silver: '+2%', gold: '+5%', diamond: '+10%',
  }

  return (
    <div className="space-y-4">
      {/* Cast button + cooldown */}
      <div className="pixel-inset p-4 text-center">
        {/* Pixel-art fishing indicator — blue square instead of emoji */}
        <div style={{ width: 20, height: 20, background: '#1e90ff', border: '2px solid #3a1f0a', margin: '0 auto 8px', imageRendering: 'pixelated' }} />
        <p className="text-sm mb-3" style={{ color: 'var(--ui-text)' }}>
          This pond plot has a fishing spot! Cast your line to catch fish and sell them.
        </p>
        <button
          onClick={castLine} disabled={!canFish || casting}
          className="pixel-btn w-full py-3"
          style={{ opacity: canFish ? 1 : 0.5 }}
        >
          {casting ? 'Fishing...' : canFish ? 'Cast Line' : `Cooldown: ${fmtCountdown(timeLeft)}`}
        </button>
        {cooldownEnd > 0 && (
          <ProgressBar pct={pct} color={canFish ? '#1e90ff' : '#4a90c0'} label={canFish ? '✓ Ready to fish!' : `Cooldown (${FISH_COOLDOWN_MS / 60000}min)`} />
        )}
      </div>

      {error && <p className="text-sm text-center" style={{ color: '#ff6644' }}>{error}</p>}

      {lastCatch && (() => {
        const fc = FISH[lastCatch.fishType as keyof typeof FISH]
        return (
          <div className="pixel-inset p-3 text-center" style={{ border: '2px solid #1e90ff' }}>
            <div style={{ width: 14, height: 14, background: '#1e90ff', border: '2px solid #3a1f0a', margin: '0 auto 4px', imageRendering: 'pixelated' }} />
            <div style={{ color: '#7fffb0', fontSize: 11, marginTop: 4 }}>
              Caught {fc?.name ?? lastCatch.fishType}! (×{lastCatch.qty})
            </div>
            <div style={{ color: 'var(--ui-tan-light)', fontSize: 9, marginTop: 2 }}>
              Worth {(fc?.sellPrice ?? 0) * lastCatch.qty} USDC
            </div>
          </div>
        )
      })()}

      {/* Rarity table */}
      <div>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>
          Fish Rarity · Luck bonus {tierLuck[plot.tier]}
        </h3>
        <div className="space-y-1">
          {Object.entries(FISH).map(([key, f]) => (
            <div key={key} className="pixel-inset flex justify-between items-center px-3 py-2">
              <span style={{ color: 'var(--ui-text)', fontSize: 11, display: 'flex', alignItems: 'center' }}><ColorDot color="#1e90ff" />{f.name}</span>
              <div className="flex gap-4 text-xs">
                <span style={{ color: 'var(--ui-tan-light)' }}>{(f.rarity * 100).toFixed(0)}%</span>
                <span style={{ color: '#ffd700' }}>{f.sellPrice} USDC</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Farmers tab ────────────────────────────────────────────────────────────────

function FarmersTab({ plotId, detail, onRefresh }: { plotId: number; detail: PlotFull | null; onRefresh: () => Promise<void> }) {
  const { publicKey } = useWallet()
  const { transferUsdc } = useUsdcTransfer()
  const [now, setNow]                   = useState(Date.now())
  const [lastHarvestAt, setLastHarvestAt] = useState<number | null>(null)
  const [harvesting, setHarvesting]     = useState(false)
  const [lastResult, setLastResult]     = useState<{ crops: number; animals: number } | null>(null)
  const [hiring, setHiring]             = useState(false)
  const [hireErr, setHireErr]           = useState<string | null>(null)

  // Tick every 5 s to update progress bars
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(id)
  }, [])

  const farmers = detail?.farmers ?? []

  // Fastest farmer on this plot drives the harvest cycle
  const fastestSpeed = farmers.reduce((max, f) => {
    const spd = FARMERS[f.farmer_type]?.speed ?? 1
    return Math.max(max, spd)
  }, 1)
  const cycleMs = Math.round(FARMER_HARVEST_BASE_MS / fastestSpeed)

  // Seed lastHarvestAt from DB on first render (use most recent last_harvest_at or purchased_at)
  useEffect(() => {
    if (!farmers.length || lastHarvestAt !== null) return
    const times = farmers.map(f =>
      f.last_harvest_at ? new Date(f.last_harvest_at).getTime()
                        : new Date(f.purchased_at).getTime()
    )
    setLastHarvestAt(Math.max(...times))
  }, [farmers, lastHarvestAt])

  const refTime = lastHarvestAt ?? Date.now()
  const elapsed = now - refTime
  const pct     = Math.min(100, (elapsed / cycleMs) * 100)
  const ready   = pct >= 100

  const runAutoHarvest = async () => {
    if (!publicKey || harvesting) return
    setHarvesting(true)
    try {
      const res  = await fetch('/api/farmers/auto-harvest', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId, wallet: publicKey.toString() }),
      })
      const data = await res.json()
      if (res.ok) {
        setLastHarvestAt(Date.now())
        setLastResult({ crops: data.crops, animals: data.animals })
        await onRefresh()
      }
    } finally {
      setHarvesting(false)
    }
  }

  // Auto-trigger when cycle completes
  useEffect(() => {
    if (ready && farmers.length > 0 && !harvesting) {
      runAutoHarvest()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const hireFarmer = async (farmerType: string) => {
    if (!publicKey || hiring) return
    setHiring(true); setHireErr(null)
    try {
      // 1. Preflight — validate server-side BEFORE opening Phantom
      const pre = await fetch(
        `/api/farmers/hire?plotId=${plotId}&farmerType=${farmerType}&wallet=${publicKey.toString()}`
      )
      const preData = await pre.json()
      if (!pre.ok) throw new Error(preData.error || 'Cannot hire farmer')

      // 2. Payment — only reached if preflight passed
      let txSignature: string | undefined
      try {
        txSignature = await transferUsdc(preData.cost ?? 1)
      } catch (txErr: unknown) {
        const msg = txErr instanceof Error ? txErr.message : ''
        if (!msg.includes('not configured')) throw txErr
        // treasury not configured — dev bypass
      }

      // 3. Commit with verified signature
      const res = await fetch('/api/farmers/hire', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId, farmerType, wallet: publicKey.toString(), txSignature }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to hire farmer')

      // Immediately spawn the farmer NPC sprite in Phaser
      globalThis.__fw?.refreshFarmers?.(plotId, data.farmerCount ?? 1)
      await onRefresh()
    } catch (e: unknown) {
      setHireErr(e instanceof Error ? e.message : 'Failed to hire farmer')
    } finally {
      setHiring(false)
    }
  }

  const fmtMs = (ms: number) => {
    const s = Math.max(0, Math.round(ms / 1000))
    return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`
  }

  return (
    <div className="space-y-4">
      {farmers.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>Hired Farmers</h3>
          <div className="space-y-3">
            {farmers.map(f => {
              const fc = FARMERS[f.farmer_type]
              const farmerCycleMs = Math.round(FARMER_HARVEST_BASE_MS / fc.speed)
              const farmerPct     = Math.min(100, (elapsed / farmerCycleMs) * 100)
              return (
                <div key={f.id} className="pixel-inset p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}>
                      <PixelIcon icon="farmer" size={14} style={{ marginRight: 4 }} />
                      {fc.name}
                    </span>
                    <span className="text-xs" style={{ color: '#7fffb0' }}>{fc.speed}x speed</span>
                  </div>
                  {/* Harvest cycle progress bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>
                        {farmerPct >= 100 ? (harvesting ? 'Harvesting…' : 'Ready!') : 'Next harvest'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>
                        {farmerPct >= 100 ? '✓' : fmtMs(farmerCycleMs - elapsed)}
                      </span>
                    </div>
                    <div style={{
                      height: 8, background: 'var(--ui-dark)', borderRadius: 2,
                      border: '1px solid var(--ui-darkest)', overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%',
                        width:  `${farmerPct}%`,
                        background: farmerPct >= 100 ? '#7fffb0' : '#4a9a6a',
                        transition: 'width 1s linear',
                      }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Manual harvest trigger + last result */}
          <div className="mt-3 space-y-2">
            <button
              onClick={runAutoHarvest}
              disabled={harvesting}
              className="pixel-btn w-full py-2 text-xs"
              style={{ opacity: harvesting ? 0.6 : 1 }}
            >
              {harvesting ? 'Harvesting…' : 'Harvest Now'}
            </button>
            {lastResult && (
              <p className="text-xs text-center" style={{ color: '#7fffb0' }}>
                Last harvest: {lastResult.crops} crop{lastResult.crops !== 1 ? 's' : ''} · {lastResult.animals} animal product{lastResult.animals !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>Hire a Farmer</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--ui-dark)' }}>
          Farmers auto-harvest crops and animals on your plot.
        </p>
        {hireErr && <p className="text-xs mb-2" style={{ color: '#ff6666' }}>{hireErr}</p>}
        <div className="space-y-2">
          {Object.entries(FARMERS).map(([key, f]) => {
            const alreadyHired = farmers.some(hf => hf.farmer_type === key)
            const disabled     = alreadyHired || hiring
            return (
              <button key={key} onClick={() => !disabled && hireFarmer(key)} disabled={disabled}
                className="pixel-inset w-full text-left p-3 hover:brightness-110 transition-all"
                style={{ opacity: disabled ? 0.5 : 1 }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}>
                    <PixelIcon icon="farmer" size={14} style={{ marginRight: 4 }} />
                    {f.name} {alreadyHired && '✓'}
                  </span>
                  <span className="font-bold" style={{ color: '#ffd700' }}>{f.cost.toLocaleString()} USDC</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--ui-tan-light)' }}>
                  {f.speed}x speed · harvests every {fmtMs(Math.round(FARMER_HARVEST_BASE_MS / f.speed))}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Defend tab (Goblin defenders) ─────────────────────────────────────────────

const GOBLIN_COLORS: Record<string, string> = {
  scout:   '#44cc44',
  guard:   '#ff8800',
  warlord: '#cc2222',
}

function DefendTab({ plotId, wallet }: { plotId: number; wallet: string }) {
  const [goblins, setGoblins]   = useState<{ tier: string; expiresAt: number }[]>([])
  const [hiring, setHiring]     = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [now, setNow]           = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch(`/api/goblins?plotId=${plotId}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setGoblins(d.map((g: { tier: string; expires_at: string }) => ({
          tier: g.tier,
          expiresAt: new Date(g.expires_at).getTime(),
        })))
      })
      .catch(() => {})
  }, [plotId])

  const hireGoblin = async (tier: string, hours: number) => {
    setHiring(true); setError(null)
    try {
      const res  = await fetch('/api/goblins/hire', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plotId, wallet, tier, hours }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to hire')
      setGoblins(prev => [...prev, { tier, expiresAt: Date.now() + hours * 3600000 }])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setHiring(false)
    }
  }

  const activeGoblins = goblins.filter(g => g.expiresAt > now)

  return (
    <div className="space-y-4">
      <div className="pixel-inset p-3">
        <p className="text-xs" style={{ color: 'var(--ui-text)' }}>
          Hire goblin guards to defend your plot against theft. Higher tiers reduce steal success rate significantly.
        </p>
      </div>

      {activeGoblins.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>Active Guards</h3>
          {activeGoblins.map((g, i) => {
            const cfg = GOBLINS[g.tier as keyof typeof GOBLINS]
            const timeLeft = g.expiresAt - now
            return (
              <div key={i} className="pixel-inset flex items-center justify-between p-3 mb-2">
                <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}><ColorDot color={GOBLIN_COLORS[g.tier] ?? '#888'} />{cfg.name}</span>
                <span className="text-xs" style={{ color: '#7fffb0' }}>
                  {fmtCountdown(timeLeft)} left · {cfg.defenseBonus}% protection
                </span>
              </div>
            )
          })}
        </div>
      )}

      {error && <p className="text-sm text-center" style={{ color: '#ff6644' }}>{error}</p>}

      <div>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--ui-darkest)' }}>Hire Goblin Guards</h3>
        <div className="space-y-2">
          {Object.entries(GOBLINS).map(([key, g]) => (
            <div key={key} className="pixel-inset p-3">
              <div className="flex justify-between mb-2">
                <span style={{ color: 'var(--ui-text)', display: 'flex', alignItems: 'center' }}><ColorDot color={GOBLIN_COLORS[key] ?? '#888'} />{g.name}</span>
                <span style={{ color: '#ff6644', fontSize: 11 }}>{g.defenseBonus}% defense</span>
              </div>
              <div className="text-xs mb-2" style={{ color: 'var(--ui-tan-light)' }}>
                Reduces attacker success by {g.defenseBonus}%
              </div>
              <div className="flex gap-2">
                {[6, 12, 24].map(hrs => (
                  <button key={hrs} disabled={hiring}
                    onClick={() => hireGoblin(key, hrs)}
                    className="pixel-btn flex-1 text-xs py-1">
                    {hrs}h · {(g.costPerHour * hrs).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Raid animation modal + steal button ────────────────────────────────────────

type RaidPhase = 'idle' | 'marching' | 'resolving' | 'done'

function StealButton({ targetPlotId, wallet }: { targetPlotId: number; wallet: string }) {
  const [phase, setPhase]       = useState<RaidPhase>('idle')
  const [result, setResult]     = useState<{ success: boolean; loot?: string; qty?: number } | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [goblinX, setGoblinX]   = useState(0)        // 0–100 (% across track)

  const launchRaid = async () => {
    setError(null); setResult(null)
    setPhase('marching'); setGoblinX(0)

    // Animate goblin marching across the track over STEAL_CONFIG.marchMs (35 min).
    // Update every 10s so React isn't hammered; the API call fires at the end.
    const start  = Date.now()
    const dur    = STEAL_CONFIG.marchMs
    const ticker = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / dur)
      setGoblinX(t * 100)
      if (t >= 1) {
        clearInterval(ticker)
        setPhase('resolving')
        doSteal()
      }
    }, 10000) // tick every 10 s
  }

  const doSteal = async () => {
    try {
      const res  = await fetch('/api/steal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ targetPlotId, wallet }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Steal failed')
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setPhase('done')
    }
  }

  const reset = () => { setPhase('idle'); setResult(null); setError(null); setGoblinX(0) }

  // Pixel goblin SVG (simple figure)
  const GoblinSvg = () => (
    <svg width="20" height="24" viewBox="0 0 10 12" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <rect x="3" y="0" width="4" height="4" fill="#44cc44"/>
      <rect x="2" y="1" width="1" height="2" fill="#44cc44"/>
      <rect x="7" y="1" width="1" height="2" fill="#44cc44"/>
      <rect x="3" y="2" width="1" height="1" fill="#ff2222"/>
      <rect x="6" y="2" width="1" height="1" fill="#ff2222"/>
      <rect x="2" y="4" width="6" height="4" fill="#2a8a2a"/>
      <rect x="1" y="5" width="2" height="3" fill="#1a6a1a"/>
      <rect x="7" y="5" width="2" height="3" fill="#1a6a1a"/>
      <rect x="2" y="8" width="2" height="3" fill="#44cc44"/>
      <rect x="6" y="8" width="2" height="3" fill="#44cc44"/>
    </svg>
  )

  // House SVG (target)
  const HouseSvg = () => (
    <svg width="28" height="28" viewBox="0 0 14 14" style={{ imageRendering: 'pixelated', display: 'block' }}>
      <polygon points="0,7 7,1 14,7" fill="#8b4513"/>
      <rect x="2" y="7" width="10" height="7" fill="#c8a060"/>
      <rect x="5" y="9" width="3"  height="5" fill="#7a4a1e"/>
      <rect x="9" y="9" width="3"  height="3" fill="#88ccff"/>
    </svg>
  )

  if (phase === 'idle') {
    return (
      <div className="space-y-2">
        <button
          onClick={launchRaid}
          className="pixel-btn w-full py-2 text-sm"
          style={{ background: '#5a1a1a', borderColor: '#8b2222', color: '#ffcccc',
            boxShadow: 'inset 1px 1px 0 #8b2a2a, inset -1px -1px 0 #2a0808, 3px 3px 0 #1a0404' }}
        >
          RAID this plot ({STEAL_CONFIG.cost} USDC)
        </button>
        <p className="text-xs text-center" style={{ color: '#8b5a2b' }}>
          {STEAL_CONFIG.baseSuccessRate}% base success · {STEAL_CONFIG.marchMs / 60000}min raid · {STEAL_CONFIG.cooldownMs / 60000}min cooldown
        </p>
      </div>
    )
  }

  return (
    <div
      className="pixel-inset p-4"
      style={{ background: '#1a0f05', border: '3px solid #8b2222' }}
    >
      {/* Raid scene */}
      <div style={{
        position:  'relative',
        height:    52,
        overflow:  'hidden',
        background: '#0a1a00',
        border:    '2px solid #3a1f0a',
        marginBottom: 10,
      }}>
        {/* Ground */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: '#2a5a00' }} />

        {/* Trees (background) */}
        {[15, 35, 55].map(x => (
          <div key={x} style={{ position: 'absolute', bottom: 8, left: `${x}%` }}>
            <div style={{ width: 6, height: 10, background: '#1a3a00', marginLeft: 3 }} />
            <div style={{ width: 12, height: 12, background: '#2d5a1b', marginBottom: -10, borderRadius: '50%', marginTop: -10 }} />
          </div>
        ))}

        {/* Target house — right side */}
        <div style={{ position: 'absolute', bottom: 8, right: 14 }}><HouseSvg /></div>

        {/* Goblin marching */}
        <div style={{
          position:  'absolute',
          bottom:    9,
          left:      `${goblinX}%`,
          transform: 'translateX(-50%)',
          transition: 'none',
        }}>
          <GoblinSvg />
        </div>

        {/* Phase text */}
        <div style={{
          position: 'absolute', top: 4, left: 0, right: 0,
          textAlign: 'center', fontSize: 7, fontFamily: '"Press Start 2P", monospace',
          color: phase === 'resolving' ? '#ff8844' : '#7fffb0',
          textShadow: '1px 1px 0 #000',
        }}>
          {phase === 'marching'   && 'MARCHING...'}
          {phase === 'resolving'  && 'RAIDING!'}
          {phase === 'done' && result?.success  && 'SUCCESS!'}
          {phase === 'done' && !result?.success && 'REPELLED!'}
          {phase === 'done' && error             && 'FAILED!'}
        </div>
      </div>

      {/* Result */}
      {phase === 'done' && (
        <div className="space-y-2">
          {error && (
            <p className="text-xs text-center" style={{ color: '#ff6644' }}>{error}</p>
          )}
          {result && (
            <div className="text-xs text-center" style={{ color: result.success ? '#7fffb0' : '#ff8844' }}>
              {result.success
                ? `Stole ${result.qty}× ${result.loot}!`
                : 'Goblins repelled your raiders!'}
            </div>
          )}
          <button onClick={reset} className="pixel-btn w-full py-2 text-xs">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ── Upgrade section ────────────────────────────────────────────────────────────

function UpgradeSection({
  level, upgrading, onUpgrade,
}: {
  level: number
  upgrading: boolean
  onUpgrade: () => void
}) {
  const nextLevel = level + 1
  const nextCfg   = UPGRADES[nextLevel]
  const isMax     = level >= MAX_UPGRADE_LEVEL
  const pct       = level / MAX_UPGRADE_LEVEL

  return (
    <div className="pixel-inset p-3 mt-2" style={{ background: '#1a0f05' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#88ccff' }}>
          Plot Upgrade — Level {level}
        </span>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: isMax ? '#ffd700' : '#7fffb0' }}>
          {isMax ? 'MAX' : `${UPGRADES[level]?.multiplier ?? 1}x yield`}
        </span>
      </div>

      {/* Level bar */}
      <div style={{ height: 6, background: '#0a0500', border: '2px solid #3a1f0a', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${pct * 100}%`, height: '100%', background: '#88ccff', transition: 'width 0.5s ease' }} />
      </div>

      {!isMax && nextCfg && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'var(--ui-dark)' }}>
            Next: {nextCfg.multiplier}x yield · costs {nextCfg.cost} USDC
          </span>
          <button
            onClick={onUpgrade}
            disabled={upgrading}
            className="pixel-btn"
            style={{ fontSize: 9, padding: '4px 12px' }}
          >
            {upgrading ? 'Upgrading...' : `Upgrade`}
          </button>
        </div>
      )}
      {isMax && (
        <div style={{ fontSize: 9, color: '#ffd700', textAlign: 'center' }}>
          Max level reached — 2x yield active!
        </div>
      )}
    </div>
  )
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="pixel-inset p-3">
      <div className="text-xs" style={{ color: 'var(--ui-tan-light)' }}>{label}</div>
      <div className="font-bold" style={{ color: 'var(--ui-text)' }}>{value}</div>
    </div>
  )
}
