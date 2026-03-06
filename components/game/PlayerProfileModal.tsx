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
  bronze: '#2a1400', silver: '#1a1a1a', gold: '#1a1500', diamond: '#001a1f',
}
const TIER_LABEL: Record<string, string> = {
  bronze: 'B', silver: 'S', gold: 'G', diamond: 'D',
}

const ITEM_EMOJI: Record<string, string> = {
  wheat: '🌾', carrots: '🥕', corn: '🌽', tomatoes: '🍅',
  pumpkin: '🎃', sunflower: '🌻', magicHerbs: '🌿',
  eggs: '🥚', milk: '🥛', wool: '🧶', truffles: '🍄', honey: '🍯',
  apple: '🍎', oak: '🌳', mango: '🥭',
  minnow: '🐟', perch: '🐠', bass: '🐡', salmon: '🐟', pike: '🦈', legendary: '✨',
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86400000)
  if (days >= 365) return `${Math.floor(days / 365)}y ago`
  if (days >= 30)  return `${Math.floor(days / 30)}mo ago`
  if (days >= 1)   return `${days}d ago`
  return 'today'
}

export default function PlayerProfileModal({ wallet, charId, playerName, onClose }: Props) {
  const [plots,     setPlots]     = useState<PlotData[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [tribeData, setTribeData] = useState<TribeData | null>(null)
  const [loading,   setLoading]   = useState(true)

  const isGuest = wallet.startsWith('guest_')
  const short   = isGuest ? 'Guest' : `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
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

  // "Member since" = earliest claimed_at across plots
  const memberSince = plots
    .map(p => p.claimed_at)
    .filter(Boolean)
    .sort()[0]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-panel"
        style={{ width: 360, maxHeight: '88vh', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: '#3a1f0a', padding: '10px 14px', flexShrink: 0,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#f0d080' }}>
            PLAYER PROFILE
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#f0d080', fontFamily: '"Press Start 2P", monospace', fontSize: 10, cursor: 'pointer' }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Identity row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Sprite portrait */}
            <div style={{
              width: 60, height: 60, flexShrink: 0,
              background: '#2d5a1b', border: '3px solid #5c3317',
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
                transform: `scale(${Math.max(1, Math.floor(52 / def.frameHeight))})`,
                transformOrigin: 'top left',
              }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Player's set name (or fallback to character class) */}
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#3a1f0a', marginBottom: 3 }}>
                {playerName?.trim() || def.label}
              </div>
              {/* Character class label shown when a custom name is set */}
              {playerName?.trim() && (
                <div style={{ fontFamily: 'system-ui', fontSize: 9, color: '#8b5a2b', marginBottom: 4 }}>
                  {def.label}
                </div>
              )}
              {isGuest ? (
                <div style={{ fontSize: 11, color: '#8b5a2b', fontFamily: 'system-ui' }}>Guest player</div>
              ) : (
                <a
                  href={`https://solscan.io/account/${wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 9, color: '#5c3317', fontFamily: 'monospace', textDecoration: 'underline', wordBreak: 'break-all' }}
                >
                  {short}
                </a>
              )}
              {/* Tribe badge */}
              {tribeData?.tribe && (
                <div style={{
                  display: 'inline-block', marginTop: 5,
                  background: '#1a0a3a', border: '2px solid #7c5cbf',
                  padding: '2px 7px', fontSize: 8,
                  fontFamily: '"Press Start 2P", monospace', color: '#c8a8ff',
                }}>
                  [{tribeData.tribe.tag}] {tribeData.tribe.name}
                  {tribeData.role === 'leader' && <span style={{ color: '#ffd700' }}> ★</span>}
                </div>
              )}
            </div>
          </div>

          {!isGuest && loading && (
            <div style={{ fontSize: 9, color: '#8b5a2b', fontFamily: 'system-ui', textAlign: 'center', padding: '12px 0' }}>
              Loading...
            </div>
          )}

          {!isGuest && !loading && (
            <>
              {/* Quick stats bar */}
              <div style={{
                display: 'flex', gap: 6,
                background: '#f5deb3', border: '2px solid #8b5a2b', padding: '7px 10px',
              }}>
                <StatPill label="PLOTS" value={String(plots.length)} />
                <StatPill label="ITEMS" value={String(inventory.reduce((s, i) => s + i.quantity, 0))} />
                {memberSince && <StatPill label="JOINED" value={timeAgo(memberSince)} />}
              </div>

              {/* Plots grid */}
              {plots.length > 0 && (
                <Section title="PLOTS">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {plots.map((p, idx) => (
                      <PlotCard key={p.id} plot={p} num={idx + 1} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Inventory */}
              {inventory.length > 0 && (
                <Section title="MATERIALS">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {inventory
                      .sort((a, b) => b.quantity - a.quantity)
                      .slice(0, 12)
                      .map(item => (
                        <InventoryBadge key={item.item_type} item={item} />
                      ))}
                  </div>
                </Section>
              )}
            </>
          )}

          {/* Actions */}
          {!isGuest && (
            <div style={{ display: 'flex', gap: 8 }}>
              <a
                href={`https://solscan.io/account/${wallet}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pixel-btn"
                style={{ flex: 1, textAlign: 'center', fontSize: 7, padding: '6px 0', textDecoration: 'none' }}
              >
                Solscan
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(wallet)}
                className="pixel-btn"
                style={{ flex: 1, fontSize: 7, padding: '6px 0', background: '#2d5a1b', borderColor: '#1a3a0d', color: '#ccffcc' }}
              >
                Copy Address
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontFamily: '"Press Start 2P", monospace', fontSize: 7,
        color: '#8b5a2b', marginBottom: 6, letterSpacing: 1,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 10, color: '#3a1f0a' }}>{value}</div>
      <div style={{ fontFamily: 'system-ui', fontSize: 9, color: '#8b5a2b', marginTop: 2 }}>{label}</div>
    </div>
  )
}

function PlotCard({ plot, num }: { plot: PlotData; num: number }) {
  const color = TIER_COLOR[plot.tier] ?? '#888'
  const bg    = TIER_BG[plot.tier]   ?? '#111'
  const label = TIER_LABEL[plot.tier] ?? '?'

  const cropEmojis   = plot.crops.slice(0, 4).map(c => ITEM_EMOJI[c.crop_type]   ?? '🌱').join('')
  const animalEmojis = plot.animals.slice(0, 3).map(a => ITEM_EMOJI[a.animal_type] ?? '🐾').join('')

  return (
    <div style={{
      background: bg,
      border: `2px solid ${color}`,
      padding: '6px 10px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Tier badge */}
      <div style={{
        width: 24, height: 24, flexShrink: 0,
        background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#000',
      }}>
        {label}
      </div>

      {/* Name + location */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color, marginBottom: 2 }}>
          {plot.name ? plot.name : `Plot #${num}`}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#888' }}>
          col {plot.col + 1}, row {plot.row + 1}
        </div>
      </div>

      {/* Emoji previews */}
      <div style={{ fontSize: 13, letterSpacing: -1, flexShrink: 0 }}>
        {cropEmojis}{animalEmojis}
        {!cropEmojis && !animalEmojis && (
          <span style={{ fontSize: 9, color: '#555', fontFamily: 'system-ui' }}>empty</span>
        )}
      </div>
    </div>
  )
}

function InventoryBadge({ item }: { item: InventoryItem }) {
  const emoji = ITEM_EMOJI[item.item_type] ?? '📦'
  const label = item.item_type.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())

  return (
    <div
      title={label}
      style={{
        background: '#2a1a0a', border: '2px solid #5c3317',
        padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4,
      }}
    >
      <span style={{ fontSize: 13 }}>{emoji}</span>
      <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#f0d080' }}>
        {item.quantity}
      </span>
    </div>
  )
}
