'use client'

/**
 * ProfileModal — "main menu" card that opens when the player clicks their
 * character portrait. Shows name, wallet, inventory, owned plots, and lets
 * the player edit their name or swap their character.
 */

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { CHARACTER_DEFS, getPlayerName, savePlayerName } from '@/config/characters'
import { CROPS, ANIMALS, FISH } from '@/config/game'
import type { PlotFull } from '@/types'
import PixelIcon from '@/components/ui/PixelIcon'

// ── Item emoji lookup ──────────────────────────────────────────────────────
const ITEM_META: Record<string, { emoji: string; label: string }> = {
  // Crops
  wheat:       { emoji: '🌾', label: 'Wheat' },
  carrots:     { emoji: '🥕', label: 'Carrots' },
  corn:        { emoji: '🌽', label: 'Corn' },
  tomatoes:    { emoji: '🍅', label: 'Tomatoes' },
  pumpkin:     { emoji: '🎃', label: 'Pumpkin' },
  sunflower:   { emoji: '🌻', label: 'Sunflower' },
  magicHerbs:  { emoji: '🌿', label: 'Magic Herbs' },
  // Animal products
  eggs:        { emoji: '🥚', label: 'Eggs' },
  milk:        { emoji: '🥛', label: 'Milk' },
  wool:        { emoji: '🧶', label: 'Wool' },
  truffles:    { emoji: '🍄', label: 'Truffles' },
  honey:       { emoji: '🍯', label: 'Honey' },
  // Fish
  minnow:      { emoji: '🐟', label: 'Minnow' },
  perch:       { emoji: '🐠', label: 'Perch' },
  bass:        { emoji: '🐡', label: 'Bass' },
  salmon:      { emoji: '🐟', label: 'Salmon' },
  pike:        { emoji: '🦈', label: 'Pike' },
  legendary:   { emoji: '✨', label: 'Legendary' },
}

// Populate from config so we never drift
for (const [k, v] of Object.entries(CROPS))   ITEM_META[k] ??= { emoji: v.emoji,  label: v.name }
for (const [k, v] of Object.entries(ANIMALS))  ITEM_META[v.produces] ??= { emoji: '📦', label: v.produces }
for (const [k, v] of Object.entries(FISH))     ITEM_META[k] ??= { emoji: v.emoji,  label: v.name }

interface InventoryItem { id: string; item_type: string; quantity: number }

interface Props {
  currentCharId:   string
  onSelectChar:    (id: string) => void   // open CharacterPicker sub-flow
  onClose:         () => void
  plots:           PlotFull[]             // already-loaded owned plots (from GameCanvas)
  sceneSetName:    (name: string) => void // calls WorldScene.setPlayerName
}

type Tab = 'profile' | 'inventory' | 'plots'

export default function ProfileModal({ currentCharId, onSelectChar, onClose, plots, sceneSetName }: Props) {
  const { publicKey } = useWallet()
  const [tab, setTab]           = useState<Tab>('profile')
  const [name, setName]         = useState(() => getPlayerName())
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput]     = useState('')
  const [inventory, setInventory]     = useState<InventoryItem[]>([])

  const loadInventory = useCallback(async () => {
    if (!publicKey) return
    try {
      const res  = await fetch(`/api/inventory?wallet=${publicKey.toString()}`)
      const data = await res.json()
      setInventory(Array.isArray(data) ? data.filter((i: InventoryItem) => i.quantity > 0) : [])
    } catch { /* ignore */ }
  }, [publicKey])

  useEffect(() => { loadInventory() }, [loadInventory])

  const saveName = () => {
    const trimmed = nameInput.trim().slice(0, 16) || 'Farmer'
    savePlayerName(trimmed)
    setName(trimmed)
    sceneSetName(trimmed)
    setEditingName(false)
  }

  const def = CHARACTER_DEFS.find(c => c.id === currentCharId) ?? CHARACTER_DEFS[0]
  const row = 3 // south-facing
  const portraitScale = Math.max(2, Math.floor(80 / def.frameHeight))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={onClose}
    >
      <div
        className="pixel-panel flex flex-col"
        style={{ width: 560, maxHeight: '85vh', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="pixel-panel-header flex items-center justify-between px-5 py-3">
          <span className="font-bold text-sm" style={{ color: 'var(--ui-text-dark)' }}>Player Profile</span>
          <button onClick={onClose} className="pixel-btn w-8 h-8 flex items-center justify-center">×</button>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '3px solid var(--ui-dark)' }}>
          {(['profile', 'inventory', 'plots'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pixel-tab capitalize ${tab === t ? 'active' : ''}`}
              style={{ flex: 1, padding: '8px 4px', fontSize: 9, whiteSpace: 'nowrap' }}
            >
              {t === 'inventory' ? `Inventory (${inventory.length})` : t === 'plots' ? `My Plots (${plots.length})` : 'Profile'}
            </button>
          ))}
        </div>

        {/* ── Tab content ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ─ Profile tab ─ */}
          {tab === 'profile' && (
            <div className="space-y-5">
              {/* Character portrait + info */}
              <div className="flex items-start gap-5">
                {/* Big sprite portrait */}
                <div
                  style={{
                    width:  def.frameWidth  * portraitScale,
                    height: def.frameHeight * portraitScale,
                    overflow: 'hidden',
                    imageRendering: 'pixelated',
                    border: '3px solid var(--ui-dark)',
                    flexShrink: 0,
                    background: '#3a2a10',
                  }}
                >
                  <div style={{
                    width:              def.frameWidth,
                    height:             def.frameHeight,
                    backgroundImage:    `url('${def.file}')`,
                    backgroundRepeat:   'no-repeat',
                    backgroundPosition: `0px -${def.frameHeight * row}px`,
                    backgroundSize:     `${def.frameWidth * def.sheetCols}px auto`,
                    imageRendering:     'pixelated',
                    transform:          `scale(${portraitScale})`,
                    transformOrigin:    'top left',
                  }} />
                </div>

                <div className="flex-1 space-y-3">
                  {/* Name */}
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--ui-dark)' }}>Player Name</p>
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value.slice(0, 16))}
                          onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                          maxLength={16}
                          className="pixel-inset flex-1 px-2 py-1 text-sm"
                          style={{ fontFamily: '"Press Start 2P"', fontSize: 10, background: '#3a2a10', color: '#fff', outline: 'none' }}
                        />
                        <button onClick={saveName} className="pixel-btn px-3 py-1 text-xs">✓</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm" style={{ color: 'var(--ui-text)' }}>{name}</span>
                        <button
                          onClick={() => { setNameInput(name); setEditingName(true) }}
                          className="pixel-btn px-2 py-0.5 text-xs"
                          style={{ fontSize: 8 }}
                        >Edit</button>
                      </div>
                    )}
                  </div>

                  {/* Character */}
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--ui-dark)' }}>Character</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: 'var(--ui-text)' }}>{def.label}</span>
                      <button
                        onClick={() => { onClose(); onSelectChar(currentCharId) }}
                        className="pixel-btn px-2 py-0.5 text-xs"
                        style={{ fontSize: 8 }}
                      >Change</button>
                    </div>
                  </div>

                  {/* Wallet */}
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--ui-dark)' }}>Wallet</p>
                    {publicKey ? (
                      <span className="text-xs font-mono" style={{ color: '#88ccff' }}>
                        {publicKey.toString().slice(0, 6)}…{publicKey.toString().slice(-4)}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--ui-dark)' }}>Not connected</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-2">
                <StatBox label="Plots Owned" value={String(plots.length)} />
                <StatBox label="Inventory Items" value={String(inventory.reduce((s, i) => s + i.quantity, 0))} />
                <StatBox
                  label="Crops Growing"
                  value={String(plots.reduce((s, p) => s + p.crops.length, 0))}
                />
              </div>
            </div>
          )}

          {/* ─ Inventory tab ─ */}
          {tab === 'inventory' && (
            <div>
              {inventory.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--ui-dark)' }}>
                  <p className="text-xs">No items yet — harvest some crops or animals!</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {inventory.map(item => {
                    const meta = ITEM_META[item.item_type]
                    return (
                      <div
                        key={item.id}
                        className="pixel-inset flex items-center justify-between px-4 py-2"
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>{meta?.emoji ?? '📦'}</span>
                        <span className="flex-1 text-sm ml-3" style={{ color: 'var(--ui-text)' }}>
                          {meta?.label ?? item.item_type}
                        </span>
                        <span className="font-bold text-sm" style={{ color: '#ffd700' }}>
                          ×{item.quantity}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─ Plots tab ─ */}
          {tab === 'plots' && (
            <div>
              {plots.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--ui-dark)' }}>
                  <p className="text-xs">You don&apos;t own any plots yet!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {plots.map(plot => {
                    const ready = plot.crops.filter(c => new Date(c.harvest_at) <= new Date()).length
                    return (
                      <div key={plot.id} className="pixel-inset flex items-center justify-between px-4 py-3">
                        <div>
                          <div className="font-bold text-sm" style={{ color: 'var(--ui-text)' }}>
                            Plot #{plot.id}
                            <span className="ml-2 font-normal text-xs" style={{ color: 'var(--ui-tan-light)' }}>
                              {plot.tier}
                            </span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: 'var(--ui-dark)' }}>
                            {plot.crops.length} crops · {plot.animals.length} animals · {plot.farmers.length} farmers
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ready > 0 && (
                            <span className="text-xs px-1.5 py-0.5 font-bold" style={{ background: '#2d5a1b', color: '#7fffb0', border: '2px solid #1a3a0d' }}>
                              {ready} ready
                            </span>
                          )}
                          <button
                            onClick={() => { globalThis.__fw?.focusPlot?.(plot.col, plot.row); onClose() }}
                            className="pixel-btn px-3 py-1 text-xs"
                            style={{ fontSize: 8 }}
                          >Visit</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="pixel-inset text-center px-3 py-3">
      <div className="font-bold text-lg" style={{ color: 'var(--ui-text)' }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--ui-tan-light)' }}>{label}</div>
    </div>
  )
}
