'use client'

import { useEffect, useState } from 'react'
import { CHARACTER_DEFS } from '@/config/characters'

interface Props {
  wallet: string
  charId: string
  playerName?: string
  onClose: () => void
}

interface PlotData {
  id: number
  tier: string
  col: number
  row: number
  name?: string
  claimed_at?: string
  crops:   Array<{ crop_type: string }>
  animals: Array<{ animal_type: string }>
  farmers: Array<unknown>
}

interface InventoryItem {
  item_type: string
  quantity: number
}

interface TribeData {
  tribe: { name: string; tag: string } | null
  role: 'leader' | 'member' | null
}

const TIER_COLOR: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#88eeff',
}
const TIER_BG: Record<string, string> = {
  bronze: '#1c0d00', silver: '#111114', gold: '#120f00', diamond: '#00111a',
}
const TIER_GLOW: Record<string, string> = {
  bronze: 'rgba(205,127,50,0.15)', silver: 'rgba(192,192,192,0.12)', gold: 'rgba(255,215,0,0.15)', diamond: 'rgba(136,238,255,0.15)',
}
const TIER_LABEL: Record<string, string> = {
  bronze: 'B', silver: 'S', gold: 'G', diamond: 'D',
}
const TIER_NAME: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond',
}

const ITEM_EMOJI: Record<string, string> = {
  wheat: '🌾', carrots: '🥕', corn: '🌽', tomatoes: '🍅',
  pumpkin: '🎃', sunflower: '🌻', magicHerbs: '🌿',
  eggs: '🥚', milk: '🥛', wool: '🧶', truffles: '🍄', honey: '🍯',
  apple: '🍎', oak: '🌳', mango: '🥭',
  minnow: '🐟', perch: '🐠', bass: '🐡', salmon: '🐟', pike: '🦈', legendary: '✨',
}
const ITEM_LABEL: Record<string, string> = {
  wheat: 'Wheat', carrots: 'Carrots', corn: 'Corn', tomatoes: 'Tomatoes',
  pumpkin: 'Pumpkin', sunflower: 'Sunflower', magicHerbs: 'Herbs',
  eggs: 'Eggs', milk: 'Milk', wool: 'Wool', truffles: 'Truffle', honey: 'Honey',
  apple: 'Apples', oak: 'Oak', mango: 'Mango',
  minnow: 'Minnow', perch: 'Perch', bass: 'Bass', salmon: 'Salmon', pike: 'Pike', legendary: 'Legend.',
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86400000)
  if (days >= 365) return `${Math.floor(days / 365)}y`
  if (days >= 30)  return `${Math.floor(days / 30)}mo`
  if (days >= 1)   return `${days}d`
  return 'Today'
}

export default function PlayerProfileModal({ wallet, charId, playerName, onClose }: Props) {
  const [plots,     setPlots]     = useState<PlotData[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [tribeData, setTribeData] = useState<TribeData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [copied,    setCopied]    = useState(false)

  const isGuest = wallet.startsWith('guest_')
  const short   = isGuest ? 'Guest' : `${wallet.slice(0, 4)}...${wallet.slice(-4)}`
  const def     = CHARACTER_DEFS.find(c => c.id === charId) ?? CHARACTER_DEFS[0]

  useEffect(() => {
    if (isGuest) { setLoading(false); return }
    Promise.all([
      fetch(`/api/player/plots?wallet=${wallet}`).then(r => r.json()),
      fetch(`/api/inventory?wallet=${wallet}`).then(r => r.json()),
      fetch(`/api/tribes?wallet=${wallet}`).then(r => r.json()),
    ]).then(([p, inv, tribe]) => {
      setPlots(Array.isArray(p) ? p : [])
      setInventory(Array.isArray(inv) ? inv.filter((i: InventoryItem) => i.quantity > 0) : [])
      setTribeData(tribe ?? null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [wallet, isGuest])

  const memberSince = plots.map(p => p.claimed_at).filter(Boolean).sort()[0]
  const totalItems  = inventory.reduce((s, i) => s + i.quantity, 0)

  function copyAddress() {
    navigator.clipboard.writeText(wallet)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 370, maxHeight: '90vh',
          background: '#0f0a06',
          border: '3px solid #5c3317',
          boxShadow: '0 0 0 1px #2a1408, 6px 6px 0 #000, inset 0 1px 0 rgba(255,200,100,0.06)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(180deg, #2a1208 0%, #1a0c04 100%)',
          borderBottom: '2px solid #3d1f0a',
          padding: '11px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, background: '#f0d080', boxShadow: '0 0 4px #f0d080' }} />
            <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#f0d080', letterSpacing: 2 }}>
              PLAYER PROFILE
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid #5c3317',
              color: '#a06040', fontFamily: '"Press Start 2P", monospace',
              fontSize: 9, cursor: 'pointer', width: 22, height: 22,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* ── Identity hero ── */}
          <div style={{
            background: 'linear-gradient(180deg, #1a1008 0%, #0f0a06 100%)',
            borderBottom: '1px solid #2a1408',
            padding: '16px 16px 14px',
            display: 'flex', gap: 14, alignItems: 'flex-start',
          }}>
            {/* Portrait */}
            <div style={{
              width: 68, height: 68, flexShrink: 0,
              background: '#1a3010',
              border: '2px solid #3d6020',
              boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6), 0 0 0 1px #0a1808',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', imageRendering: 'pixelated',
            }}>
              <div style={{
                width: def.frameWidth, height: def.frameHeight,
                backgroundImage: `url('${def.file}')`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: `0px -${def.frameHeight * 3}px`,
                backgroundSize: `${def.frameWidth * def.sheetCols}px auto`,
                imageRendering: 'pixelated',
                transform: `scale(${Math.max(1.5, Math.floor(56 / def.frameHeight))})`,
                transformOrigin: 'top left',
              }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Name */}
              <div style={{
                fontFamily: '"Press Start 2P", monospace', fontSize: 11,
                color: '#f5e090', marginBottom: 4,
                textShadow: '0 0 8px rgba(245,224,144,0.3)',
              }}>
                {playerName?.trim() || def.label}
              </div>

              {/* Character class */}
              <div style={{
                fontSize: 10, color: '#7a6040', fontFamily: 'system-ui',
                marginBottom: 6,
              }}>
                {playerName?.trim() ? def.label : 'Farmer'}
              </div>

              {/* Wallet */}
              {!isGuest ? (
                <a
                  href={`https://solscan.io/account/${wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    fontSize: 9, color: '#5a7a50', fontFamily: 'monospace',
                    textDecoration: 'none',
                    background: 'rgba(90,122,80,0.12)',
                    border: '1px solid rgba(90,122,80,0.25)',
                    padding: '2px 6px',
                  }}
                >
                  {short} ↗
                </a>
              ) : (
                <span style={{ fontSize: 10, color: '#5a5040', fontFamily: 'system-ui' }}>Guest player</span>
              )}

              {/* Tribe badge */}
              {tribeData?.tribe && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  marginTop: 8,
                  background: 'rgba(100,60,200,0.15)',
                  border: '1px solid rgba(140,100,240,0.4)',
                  padding: '3px 8px',
                }}>
                  <span style={{ fontSize: 9, color: '#a080e0', fontFamily: 'monospace' }}>
                    [{tribeData.tribe.tag}]
                  </span>
                  <span style={{ fontSize: 9, color: '#c0a0f0', fontFamily: 'system-ui' }}>
                    {tribeData.tribe.name}
                  </span>
                  {tribeData.role === 'leader' && (
                    <span style={{ fontSize: 10, color: '#ffd700' }}>★</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Loading ── */}
          {!isGuest && loading && (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: 9, color: '#5a4030', fontFamily: 'system-ui' }}>
              Loading profile...
            </div>
          )}

          {!isGuest && !loading && (
            <>
              {/* ── Stats row ── */}
              <div style={{
                display: 'flex',
                borderBottom: '1px solid #1a0f05',
              }}>
                {[
                  { label: 'Plots', value: String(plots.length) },
                  { label: 'Items', value: String(totalItems) },
                  ...(memberSince ? [{ label: 'Member', value: timeAgo(memberSince) }] : []),
                ].map((s, i, arr) => (
                  <div key={s.label} style={{
                    flex: 1, padding: '10px 0', textAlign: 'center',
                    borderRight: i < arr.length - 1 ? '1px solid #1a0f05' : 'none',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent',
                  }}>
                    <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 12, color: '#e8c860', marginBottom: 4 }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize: 9, color: '#5a4530', fontFamily: 'system-ui', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Plots ── */}
              {plots.length > 0 && (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a0f05' }}>
                  <SectionLabel>Plots</SectionLabel>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {plots.map((p, idx) => (
                      <PlotCard key={p.id} plot={p} num={idx + 1} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Materials ── */}
              {inventory.length > 0 && (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a0f05' }}>
                  <SectionLabel>Materials</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {inventory
                      .sort((a, b) => b.quantity - a.quantity)
                      .slice(0, 12)
                      .map(item => <InventoryBadge key={item.item_type} item={item} />)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Actions ── */}
          {!isGuest && (
            <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
              <a
                href={`https://solscan.io/account/${wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flex: 1, textAlign: 'center',
                  fontSize: 8, padding: '8px 0',
                  fontFamily: '"Press Start 2P", monospace',
                  color: '#7a6040', textDecoration: 'none',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid #3a2010',
                  cursor: 'pointer',
                }}
              >
                Solscan ↗
              </a>
              <button
                onClick={copyAddress}
                style={{
                  flex: 2, fontSize: 8, padding: '8px 0',
                  fontFamily: '"Press Start 2P", monospace',
                  color: copied ? '#80ff80' : '#a0d080',
                  background: copied ? 'rgba(80,160,80,0.15)' : 'rgba(60,120,30,0.12)',
                  border: `1px solid ${copied ? '#40a040' : '#2d5a1b'}`,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {copied ? '✓ Copied!' : 'Copy Address'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 8, fontFamily: '"Press Start 2P", monospace',
      color: '#4a3020', letterSpacing: 2, marginBottom: 8,
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

function PlotCard({ plot, num }: { plot: PlotData; num: number }) {
  const color = TIER_COLOR[plot.tier] ?? '#888'
  const bg    = TIER_BG[plot.tier]   ?? '#111'
  const glow  = TIER_GLOW[plot.tier] ?? 'transparent'
  const label = TIER_LABEL[plot.tier] ?? '?'
  const name  = TIER_NAME[plot.tier]  ?? plot.tier

  const cropEmojis = plot.crops.slice(0, 3).map(c => ITEM_EMOJI[c.crop_type] ?? '🌱').join(' ')
  const animalTypes = plot.animals.slice(0, 3).map(a => a.animal_type)
  const hasContent  = cropEmojis || animalTypes.length > 0

  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}`,
      boxShadow: `inset 0 0 20px ${glow}`,
      padding: '7px 10px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Tier badge */}
      <div style={{
        width: 28, height: 28, flexShrink: 0,
        background: `rgba(${color === '#cd7f32' ? '205,127,50' : color === '#c0c0c0' ? '192,192,192' : color === '#ffd700' ? '255,215,0' : '136,238,255'},0.15)`,
        border: `1px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Press Start 2P", monospace', fontSize: 10, color,
      }}>
        {label}
      </div>

      {/* Name + tier + location */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#c8a060', marginBottom: 3 }}>
          {plot.name || `Plot #${num}`}
        </div>
        <div style={{ fontSize: 9, color: '#4a3820', fontFamily: 'system-ui' }}>
          {name} · {plot.col + 1},{plot.row + 1}
        </div>
      </div>

      {/* Content preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {cropEmojis && <span style={{ fontSize: 13 }}>{cropEmojis}</span>}
        {animalTypes.map(t => <AnimalSprite key={t} type={t} />)}
        {!hasContent && <span style={{ fontSize: 8, color: '#2a1a10', fontFamily: 'system-ui' }}>empty</span>}
      </div>
    </div>
  )
}

// Renders the first frame of an animal spritesheet (32×32 from top-left of 64×64 sheet)
function AnimalSprite({ type }: { type: string }) {
  const file = `/assets/${type}.png`
  return (
    <div style={{
      width: 20, height: 20,
      backgroundImage: `url('${file}')`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0px 0px',
      backgroundSize: '40px 40px', // 64×64 scaled to 40×40 so frame is 20×20
      imageRendering: 'pixelated',
    }} title={type} />
  )
}

function InventoryBadge({ item }: { item: InventoryItem }) {
  const emoji = ITEM_EMOJI[item.item_type]  ?? '📦'
  const label = ITEM_LABEL[item.item_type]  ?? item.item_type

  return (
    <div
      title={label}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid #2a1a0a',
        padding: '5px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        minWidth: 44,
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#e8c060' }}>
        {item.quantity}
      </span>
      <span style={{ fontSize: 8, color: '#4a3820', fontFamily: 'system-ui' }}>
        {label}
      </span>
    </div>
  )
}
