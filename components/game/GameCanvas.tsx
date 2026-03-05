'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { Plot, PlotFull } from '@/types'
import { WorldScene, setSceneCallbacks } from './WorldScene'
import PlotModal        from './PlotModal'
import PlotHUD           from './PlotHUD'
import Minimap           from './Minimap'
import MapModal          from './MapModal'
import CharacterPicker   from './CharacterPicker'
import ProfileModal      from './ProfileModal'
import LeaderboardModal  from './LeaderboardModal'
import ActivityFeed      from './ActivityFeed'
import AllianceModal     from './AllianceModal'
import TradeModal        from './TradeModal'
import AchievementToast  from './AchievementToast'
import LiveChat          from './LiveChat'
import { WORLD_COLS, WORLD_ROWS, CROPS, ANIMALS, FISH, ACHIEVEMENT_DEFS, GOLDEN_HOUR_INTERVAL_MS, GOLDEN_HOUR_DURATION_MS } from '@/config/game'
import { getSavedCharacter, CHARACTER_DEFS } from '@/config/characters'

// ── Emoji lookup for inventory HUD ────────────────────────────────────────
const ITEM_EMOJI: Record<string, string> = {}
for (const [k, v] of Object.entries(CROPS))   ITEM_EMOJI[k]          = v.emoji
for (const [, v] of Object.entries(ANIMALS))  ITEM_EMOJI[v.produces] ??= '📦'
for (const [k, v] of Object.entries(FISH))    ITEM_EMOJI[k]          = v.emoji
ITEM_EMOJI['eggs']     = '🥚'
ITEM_EMOJI['milk']     = '🥛'
ITEM_EMOJI['wool']     = '🧶'
ITEM_EMOJI['truffles'] = '🍄'
ITEM_EMOJI['honey']    = '🍯'

interface InventoryRow { id: string; item_type: string; quantity: number }

interface Props {
  plots: Plot[]
  onPlotsChange: (plots: Plot[]) => void
}

export default function GameCanvas({ plots, onPlotsChange }: Props) {
  const gameRef      = useRef<import('phaser').Game | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const starterChecked = useRef<string | null>(null)
  const { publicKey } = useWallet()

  // Plot modal (opened on click)
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null)
  const [plotDetail,   setPlotDetail]   = useState<PlotFull | null>(null)
  const [loadingPlot,  setLoadingPlot]  = useState(false)

  // HUD (tracks currently focused/navigated plot)
  const [currentPlot, setCurrentPlot] = useState({ col: 0, row: 0 })
  const [hudDetail,   setHudDetail]   = useState<PlotFull | null>(null)

  const [showMapModal,       setShowMapModal]       = useState(false)
  const [showCharPicker,     setShowCharPicker]     = useState(false)
  const [showProfile,        setShowProfile]        = useState(false)
  const [showLeaderboard,    setShowLeaderboard]    = useState(false)
  const [showAlliance,       setShowAlliance]       = useState(false)
  const [showTrades,         setShowTrades]         = useState(false)
  const [bonusToast,         setBonusToast]         = useState<string | null>(null)
  const [goldenHour,         setGoldenHour]         = useState(false)
  const [achQueue,           setAchQueue]           = useState<string[]>([])
  const [isTouchDevice,      setIsTouchDevice]      = useState(false)
  const [chatStatus,         setChatStatus]         = useState('')
  const [showChatInput,      setShowChatInput]      = useState(false)
  const [chatDraft,          setChatDraft]          = useState('')
  const [currentCharId,      setCurrentCharId]      = useState(() =>
    typeof window !== 'undefined' ? getSavedCharacter().id : 'player'
  )
  const [inventory,          setInventory]          = useState<InventoryRow[]>([])
  const [ownedPlots,         setOwnedPlots]         = useState<PlotFull[]>([])

  // Derive focused plot object from col/row
  const focusedPlot = plots.find(p => p.col === currentPlot.col && p.row === currentPlot.row) ?? null

  // When HUD detail matches the selected-plot detail, reuse it; otherwise fetch
  useEffect(() => {
    if (!focusedPlot?.owner_wallet) { setHudDetail(null); return }

    // Reuse already-loaded detail if it matches
    if (plotDetail && selectedPlot?.id === focusedPlot.id) {
      setHudDetail(plotDetail)
      return
    }

    const ctrl = new AbortController()
    fetch(`/api/plots/${focusedPlot.id}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(d => setHudDetail(d))
      .catch(() => {})
    return () => ctrl.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedPlot?.id, plotDetail])

  const handlePlotClick = useCallback(async (plot: Plot) => {
    setSelectedPlot(plot)
    setLoadingPlot(true)
    try {
      const res  = await fetch(`/api/plots/${plot.id}`)
      const data = await res.json()
      setPlotDetail(data)
      setHudDetail(data)
    } catch {
      setPlotDetail(null)
    } finally {
      setLoadingPlot(false)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return

    const initPhaser = async () => {
      const Phaser = (await import('phaser')).default
      setSceneCallbacks(publicKey?.toString() ?? null, handlePlotClick)

      gameRef.current = new Phaser.Game({
        type:            Phaser.AUTO,
        parent:          containerRef.current!,
        width:           containerRef.current!.clientWidth,
        height:          containerRef.current!.clientHeight,
        backgroundColor: '#2d5a1b',
        scene:           [WorldScene],
        pixelArt:        true,
        scale: {
          mode:       Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      })
    }

    initPhaser()
    return () => { gameRef.current?.destroy(true); gameRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll scene for currentCol/Row (drives nav arrows + HUD)
  useEffect(() => {
    const id = setInterval(() => {
      const scene = gameRef.current?.scene.getScene('WorldScene') as WorldScene | null
      const state = scene?.getSceneState?.()
      if (state) setCurrentPlot({ col: state.currentCol, row: state.currentRow })
    }, 150)
    return () => clearInterval(id)
  }, [])

  // Detect touch device for mobile D-pad
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
  }, [])

  // Daily login bonus — localStorage prevents multiple claims per day
  useEffect(() => {
    if (!publicKey) return
    const today = new Date().toISOString().slice(0, 10)
    const key   = `farm:daily:${publicKey.toString()}:${today}`
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
    fetch('/api/daily-bonus', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ wallet: publicKey.toString() }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) setBonusToast('Daily bonus: +3 wheat!')
      })
      .catch(() => {})
  }, [publicKey])

  // Auto-dismiss bonus toast after 4 seconds
  useEffect(() => {
    if (!bonusToast) return
    const id = setTimeout(() => setBonusToast(null), 4000)
    return () => clearTimeout(id)
  }, [bonusToast])

  // ── Golden Hour (deterministic 6-hr cycle, 1-hr duration) ──────────────────
  useEffect(() => {
    const check = () => {
      const nowMs   = Date.now()
      const cycleMs = nowMs % GOLDEN_HOUR_INTERVAL_MS
      setGoldenHour(cycleMs < GOLDEN_HOUR_DURATION_MS)
    }
    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Referral tracking — read ?ref= from URL on wallet connect ─────────────
  useEffect(() => {
    if (!publicKey) return
    const wallet = publicKey.toString()
    const refKey = `farm:ref:${wallet}`
    if (localStorage.getItem(refKey)) return  // Already processed

    const params = new URLSearchParams(window.location.search)
    const ref    = params.get('ref')
    if (!ref || ref === wallet) return

    localStorage.setItem(refKey, '1')
    fetch('/api/referrals', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ referrerWallet: ref, referredWallet: wallet }),
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setBonusToast('Welcome! You and your referrer both got bonus wheat!') })
      .catch(() => {})
  }, [publicKey])

  // ── Browser harvest notifications — schedule via localStorage ─────────────
  useEffect(() => {
    if (!publicKey) return
    // On page load, check for any pending notification alerts
    const checkNotifs = () => {
      const prefix = `farm:notif:`
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key?.startsWith(prefix)) continue
        const readyAt = parseInt(localStorage.getItem(key) ?? '0', 10)
        if (Date.now() >= readyAt) {
          const label = key.replace(prefix, '').replace(/_/g, ' ')
          if (Notification.permission === 'granted') {
            new Notification('Land Grab', { body: `${label} is ready to harvest!`, icon: '/favicon.ico' })
          }
          localStorage.removeItem(key)
        }
      }
    }
    checkNotifs()
    const id = setInterval(checkNotifs, 30_000)
    return () => clearInterval(id)
  }, [publicKey])

  // ── Chat status — load from localStorage ─────────────────────────────────
  useEffect(() => {
    if (!publicKey) return
    const saved = localStorage.getItem(`farm:chat:${publicKey.toString()}`) ?? ''
    setChatStatus(saved)
    setChatDraft(saved)
  }, [publicKey])

  // Free starter plot — auto-claim first Bronze for new wallets
  useEffect(() => {
    if (!publicKey || plots.length === 0) return
    const walletStr = publicKey.toString()
    if (starterChecked.current === walletStr) return
    starterChecked.current = walletStr

    const hasPlot = plots.some(p => p.owner_wallet === publicKey.toString())
    if (hasPlot) return

    const freeBronze = plots.find(p => !p.owner_wallet && p.tier === 'bronze')
    if (!freeBronze) return

    fetch('/api/plots/claim', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ plotId: freeBronze.id, wallet: publicKey.toString() }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.plot) {
          onPlotsChange(plots.map(p => p.id === d.plot.id ? d.plot : p))
          setBonusToast('Welcome! A free Bronze plot has been claimed for you!')
        }
      })
      .catch(() => {})
  }, [publicKey, plots, onPlotsChange])

  // Poll inventory every 30 s when wallet connected
  useEffect(() => {
    if (!publicKey) { setInventory([]); return }
    const load = () =>
      fetch(`/api/inventory?wallet=${publicKey.toString()}`)
        .then(r => r.json())
        .then(d => Array.isArray(d) ? setInventory(d.filter((i: InventoryRow) => i.quantity > 0)) : null)
        .catch(() => {})
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [publicKey])

  // Load owned plots for ProfileModal when it opens
  useEffect(() => {
    if (!showProfile || !publicKey) return
    fetch(`/api/player/plots?wallet=${publicKey.toString()}`)
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setOwnedPlots(d) : null)
      .catch(() => {})
  }, [showProfile, publicKey])

  // Listen for programmatic plot opens from My Plots panel
  useEffect(() => {
    const handler = (e: Event) => {
      const plot = (e as CustomEvent).detail
      if (plot) handlePlotClick(plot)
    }
    window.addEventListener('farm:openPlot', handler)
    return () => window.removeEventListener('farm:openPlot', handler)
  }, [handlePlotClick])

  // Sync wallet into running scene
  useEffect(() => {
    const scene = gameRef.current?.scene.getScene('WorldScene') as WorldScene | null
    scene?.setWallet(publicKey?.toString() ?? null)
  }, [publicKey])

  // Disable Phaser canvas clicks while modal is open
  useEffect(() => {
    const canvas = gameRef.current?.canvas
    if (canvas) canvas.style.pointerEvents = selectedPlot ? 'none' : ''
  }, [selectedPlot])

  const handleCharacterSelect = (id: string) => {
    setCurrentCharId(id)
    const scene = gameRef.current?.scene.getScene('WorldScene') as WorldScene | null
    scene?.setCharacter(id)
    setShowCharPicker(false)
  }

  const handlePlotUpdate = (updatedPlot: Plot) => {
    onPlotsChange(plots.map(p => p.id === updatedPlot.id ? updatedPlot : p))
    const scene = gameRef.current?.scene.getScene('WorldScene') as WorldScene | null
    scene?.refreshPlot(updatedPlot)
    setSelectedPlot(updatedPlot)
  }

  const navigate = (dc: number, dr: number) => {
    const newCol = Math.max(0, Math.min(WORLD_COLS - 1, currentPlot.col + dc))
    const newRow = Math.max(0, Math.min(WORLD_ROWS - 1, currentPlot.row + dr))
    globalThis.__fw?.focusPlot?.(newCol, newRow)
  }

  // Called by PlotModal after planting/buying animal to schedule a browser notification
  const scheduleNotification = (label: string, readyAtMs: number) => {
    localStorage.setItem(`farm:notif:${label.replace(/ /g, '_')}`, String(readyAtMs))
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  // Expose to PlotModal via window event
  useEffect(() => {
    const handler = (e: Event) => {
      const { label, readyAtMs, achievementIds } = (e as CustomEvent).detail ?? {}
      if (label && readyAtMs) scheduleNotification(label, readyAtMs)
      if (Array.isArray(achievementIds) && achievementIds.length > 0) {
        setAchQueue(prev => [...prev, ...achievementIds])
      }
    }
    window.addEventListener('farm:event', handler)
    return () => window.removeEventListener('farm:event', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveChatStatus = async (text: string) => {
    if (!publicKey) return
    const wallet = publicKey.toString()
    setChatStatus(text)
    localStorage.setItem(`farm:chat:${wallet}`, text)
    setShowChatInput(false)
    await fetch('/api/status', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ wallet, statusText: text }),
    })
  }

  // Achievement currently showing
  const currentAch  = achQueue[0] ?? null
  const currentAchDef = currentAch ? ACHIEVEMENT_DEFS[currentAch] : null

  return (
    <div className="relative w-full h-full">
      {/* ── Phaser canvas ─────────────────────────────────── */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ pointerEvents: selectedPlot ? 'none' : 'auto' }}
      />

      {/* ── Navigation arrows ─────────────────────────────── */}
      <NavBtn
        disabled={currentPlot.row === 0}
        onClick={() => navigate(0, -1)}
        style={{ top: 12, left: '50%', transform: 'translateX(-50%)' }}
      >▲</NavBtn>
      <NavBtn
        disabled={currentPlot.row === WORLD_ROWS - 1}
        onClick={() => navigate(0, 1)}
        style={{ bottom: 80, left: '50%', transform: 'translateX(-50%)' }}
      >▼</NavBtn>
      <NavBtn
        disabled={currentPlot.col === 0}
        onClick={() => navigate(-1, 0)}
        style={{ left: 12, top: '50%', transform: 'translateY(-50%)' }}
      >◀</NavBtn>
      <NavBtn
        disabled={currentPlot.col === WORLD_COLS - 1}
        onClick={() => navigate(1, 0)}
        style={{ right: 12, top: '50%', transform: 'translateY(-50%)' }}
      >▶</NavBtn>

      {/* ── Plot position chip ────────────────────────────── */}
      <div
        style={{
          position:      'absolute',
          top:           12,
          left:          '50%',
          transform:     'translateX(-50%)',
          zIndex:        20,
          pointerEvents: 'none',
          marginTop:     48,
        }}
      >
        <div
          style={{
            fontFamily:    '"Press Start 2P", monospace',
            fontSize:      11,
            background:    '#d4a574',
            border:        '3px solid #3a1f0a',
            boxShadow:     'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b, 3px 3px 0 #3a1f0a',
            color:         '#3a1f0a',
            padding:       '4px 14px',
            whiteSpace:    'nowrap',
          }}
        >
          ({currentPlot.col + 1}, {currentPlot.row + 1}) / {WORLD_COLS}×{WORLD_ROWS}
          <span style={{ color: '#8b5a2b', fontSize: 9 }}> · WASD · Click to open</span>
        </div>
      </div>

      {/* ── Plot HUD (top-right) ──────────────────────────── */}
      <PlotHUD
        plot={focusedPlot}
        detail={hudDetail}
        myWallet={publicKey?.toString() ?? null}
      />

      {/* ── Home button (above character picker) ─────────── */}
      <button
        onClick={() => {
          const owned = plots.find(p => p.owner_wallet === publicKey?.toString())
          if (owned) globalThis.__fw?.focusPlot?.(owned.col, owned.row)
        }}
        title="Go to my plot"
        style={{
          position:       'absolute',
          bottom:         68,
          left:           12,
          zIndex:         20,
          width:          48,
          height:         48,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#2d5a1b',
          border:         '3px solid #1a3a0d',
          boxShadow:      publicKey && plots.some(p => p.owner_wallet === publicKey.toString())
                            ? 'inset 2px 2px 0 #3d8a2b, inset -2px -2px 0 #1a2a10, 3px 3px 0 #0a1a05'
                            : 'none',
          cursor:         publicKey && plots.some(p => p.owner_wallet === publicKey.toString()) ? 'pointer' : 'not-allowed',
          opacity:        publicKey && plots.some(p => p.owner_wallet === publicKey.toString()) ? 1 : 0.4,
          padding:        0,
        }}
      >
        {/* House pixel icon */}
        <svg width="22" height="22" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
          <rect x="3"  y="8"  width="10" height="7" fill="#c8a060"/>
          <rect x="5"  y="10" width="3"  height="5" fill="#7a4a1e"/>
          <rect x="9"  y="10" width="3"  height="3" fill="#88ccff"/>
          <polygon points="1,8 8,2 15,8" fill="#8b4513"/>
          <rect x="6" y="3" width="4" height="4" fill="#a0522d"/>
        </svg>
        <span style={{ fontSize: 6, fontFamily: '"Press Start 2P", monospace', color: '#ccffcc', marginTop: 1 }}>HOME</span>
      </button>

      {/* ── Character picker button (bottom-left) → opens ProfileModal ──── */}
      <button
        onClick={() => setShowProfile(true)}
        title="Player profile"
        style={{
          position:       'absolute',
          bottom:         12,
          left:           12,
          zIndex:         20,
          width:          48,
          height:         48,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            2,
          background:     '#d4a574',
          border:         '3px solid #3a1f0a',
          boxShadow:      'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b, 3px 3px 0 #3a1f0a',
          cursor:         'pointer',
          overflow:       'hidden',
          padding:        0,
        }}
      >
        {/* Sprite portrait of current character */}
        {(() => {
          const def  = CHARACTER_DEFS.find(c => c.id === currentCharId) ?? CHARACTER_DEFS[0]
          const row  = 3  // south-facing row
          const scale = Math.max(1, Math.floor(36 / def.frameHeight))
          return (
            <div style={{
              width:              def.frameWidth  * scale,
              height:             def.frameHeight * scale,
              overflow:           'hidden',
              imageRendering:     'pixelated',
              flexShrink:         0,
            }}>
              <div style={{
                width:               def.frameWidth,
                height:              def.frameHeight,
                backgroundImage:     `url('${def.file}')`,
                backgroundRepeat:    'no-repeat',
                backgroundPosition:  `0px -${def.frameHeight * row}px`,
                backgroundSize:      `${def.frameWidth * def.sheetCols}px auto`,
                imageRendering:      'pixelated',
                transform:           `scale(${scale})`,
                transformOrigin:     'top left',
              }} />
            </div>
          )
        })()}
      </button>

      {/* ── Vertical inventory HUD (top-left) ────────────── */}
      {inventory.length > 0 && (
        <div style={{
          position:    'absolute',
          top:         12,
          left:        12,
          zIndex:      20,
          display:     'flex',
          flexDirection: 'column',
          gap:         4,
          pointerEvents: 'none',
        }}>
          {inventory.map(item => (
            <div
              key={item.id}
              style={{
                display:     'flex',
                alignItems:  'center',
                gap:         6,
                background:  'rgba(42,20,6,0.82)',
                border:      '2px solid #5a3010',
                padding:     '3px 8px 3px 6px',
                boxShadow:   'inset 1px 1px 0 #8b5a2b, 2px 2px 0 #1a0a00',
                fontFamily:  '"Press Start 2P", monospace',
                fontSize:    9,
                color:       '#f0d080',
                whiteSpace:  'nowrap',
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{ITEM_EMOJI[item.item_type] ?? '📦'}</span>
              <span style={{ color: '#fff' }}>×{item.quantity}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Bonus toast ───────────────────────────────────── */}
      {bonusToast && (
        <div
          style={{
            position:   'absolute',
            top:        70,
            left:       '50%',
            transform:  'translateX(-50%)',
            zIndex:     30,
            fontFamily: '"Press Start 2P", monospace',
            fontSize:   10,
            background: '#2a5a1b',
            border:     '3px solid #1a3a0d',
            boxShadow:  'inset 2px 2px 0 #3d8a2b, inset -2px -2px 0 #1a2a10, 3px 3px 0 #0a1a05',
            color:      '#ccffcc',
            padding:    '8px 16px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {bonusToast}
        </div>
      )}

      {/* ── Leaderboard button ────────────────────────────── */}
      <button
        onClick={() => setShowLeaderboard(true)}
        title="Leaderboard"
        style={{
          position:       'absolute',
          bottom:         68,
          right:          12,
          zIndex:         20,
          width:          48,
          height:         48,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#d4a574',
          border:         '3px solid #3a1f0a',
          boxShadow:      'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b, 3px 3px 0 #3a1f0a',
          cursor:         'pointer',
          padding:        0,
        }}
      >
        <svg width="22" height="22" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
          <rect x="1"  y="9"  width="4" height="6" fill="#cd7f32"/>
          <rect x="6"  y="5"  width="4" height="10" fill="#c0c0c0"/>
          <rect x="11" y="2"  width="4" height="13" fill="#ffd700"/>
          <rect x="1"  y="8"  width="4" height="1" fill="#a05a20"/>
          <rect x="6"  y="4"  width="4" height="1" fill="#909090"/>
          <rect x="11" y="1"  width="4" height="1" fill="#c8a800"/>
        </svg>
        <span style={{ fontSize: 6, fontFamily: '"Press Start 2P", monospace', color: '#3a1f0a', marginTop: 1 }}>TOP</span>
      </button>

      {/* ── Minimap ───────────────────────────────────────── */}
      <Minimap sceneRef={gameRef} onOpenMap={() => setShowMapModal(true)} />

      {/* ── Golden Hour banner ────────────────────────────── */}
      {goldenHour && (
        <div style={{
          position:   'absolute',
          top:        60,
          left:       '50%',
          transform:  'translateX(-50%)',
          zIndex:     25,
          background: 'rgba(80,50,0,0.92)',
          border:     '3px solid #ffd700',
          boxShadow:  '0 0 20px rgba(255,215,0,0.5)',
          color:      '#ffd700',
          fontFamily: '"Press Start 2P", monospace',
          fontSize:   8,
          padding:    '5px 14px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          animation:  'pulse 2s infinite',
        }}>
          ✨ GOLDEN HOUR · +20% YIELD BONUS ✨
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.7} }`}</style>
        </div>
      )}

      {/* ── Activity feed ─────────────────────────────────── */}
      {!selectedPlot && <ActivityFeed />}

      {/* ── Live chat ─────────────────────────────────────── */}
      <LiveChat wallet={publicKey?.toString() ?? null} />

      {/* ── Alliance + Trades buttons (bottom-right stack) ── */}
      <button
        onClick={() => setShowAlliance(true)}
        title="Alliances"
        style={{
          position:       'absolute',
          bottom:         124,
          right:          12,
          zIndex:         20,
          width:          48,
          height:         48,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#3a2a6a',
          border:         '3px solid #1a1040',
          boxShadow:      'inset 2px 2px 0 #5a4a9a, inset -2px -2px 0 #1a0a3a, 3px 3px 0 #0a0520',
          cursor:         'pointer',
          padding:        0,
        }}
      >
        <span style={{ fontSize: 18 }}>⚔️</span>
        <span style={{ fontSize: 5, fontFamily: '"Press Start 2P", monospace', color: '#cc88ff', marginTop: 1 }}>ALLY</span>
      </button>

      <button
        onClick={() => setShowTrades(true)}
        title="Plot Trading"
        style={{
          position:       'absolute',
          bottom:         180,
          right:          12,
          zIndex:         20,
          width:          48,
          height:         48,
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          background:     '#5a4a00',
          border:         '3px solid #2a2000',
          boxShadow:      'inset 2px 2px 0 #8a7000, inset -2px -2px 0 #2a2000, 3px 3px 0 #1a1000',
          cursor:         'pointer',
          padding:        0,
        }}
      >
        <span style={{ fontSize: 18 }}>🤝</span>
        <span style={{ fontSize: 5, fontFamily: '"Press Start 2P", monospace', color: '#ffd700', marginTop: 1 }}>TRADE</span>
      </button>

      {/* ── Chat status bubble (above profile button) ─────── */}
      {publicKey && (
        <div style={{ position: 'absolute', bottom: 68, left: 68, zIndex: 25 }}>
          {chatStatus && (
            <div className="pixel-panel" style={{
              fontSize:      8,
              padding:       '3px 8px',
              maxWidth:      160,
              whiteSpace:    'nowrap',
              overflow:      'hidden',
              textOverflow:  'ellipsis',
              pointerEvents: 'none',
              marginBottom:  4,
              boxShadow:     'inset 1px 1px 0 #e8c090, inset -1px -1px 0 #8b5a2b, 2px 2px 0 #3a1f0a',
            }}>
              {chatStatus}
            </div>
          )}
          <button
            onClick={() => setShowChatInput(v => !v)}
            className="pixel-btn"
            style={{ fontSize: 7, padding: '4px 8px' }}
          >
            {showChatInput ? 'Cancel' : 'Status'}
          </button>
          {showChatInput && (
            <div className="pixel-panel" style={{
              position:     'absolute',
              bottom:       '100%',
              left:         0,
              marginBottom: 4,
              display:      'flex',
              gap:          4,
              padding:      6,
              zIndex:       30,
              boxShadow:    'inset 1px 1px 0 #e8c090, inset -1px -1px 0 #8b5a2b, 3px 3px 0 #3a1f0a',
            }}>
              <input
                autoFocus
                className="pixel-input"
                value={chatDraft}
                onChange={e => setChatDraft(e.target.value.slice(0, 24))}
                onKeyDown={e => { if (e.key === 'Enter') saveChatStatus(chatDraft) }}
                placeholder="Your status..."
                style={{ width: 140, fontSize: 8 }}
              />
              <button
                onClick={() => saveChatStatus(chatDraft)}
                className="pixel-btn"
                style={{ fontSize: 7, padding: '2px 6px', background: '#2d5a1b', borderColor: '#1a3a0d', color: '#ccffcc' }}
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Referral share button (bottom of inventory) ───── */}
      {publicKey && (
        <button
          onClick={() => {
            const url = `${window.location.origin}?ref=${publicKey.toString()}`
            navigator.clipboard.writeText(url).then(() => setBonusToast('Referral link copied!'))
          }}
          title="Copy referral link"
          style={{
            position:    'absolute',
            top:         12,
            left:        inventory.length > 0 ? `${12 + inventory.length * 0}px` : '12px',
            zIndex:      25,
            pointerEvents: 'auto',
            display:     'none', // Shown only via the share link in PlotModal or header
          }}
        />
      )}

      {/* ── Leaderboard modal ────────────────────────────── */}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}

      {/* ── Map modal ─────────────────────────────────────── */}
      {showMapModal && (
        <MapModal
          plots={plots}
          currentCol={currentPlot.col}
          currentRow={currentPlot.row}
          onNavigate={(col, row) => globalThis.__fw?.focusPlot?.(col, row)}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {/* ── Character picker modal ─────────────────────────── */}
      {showCharPicker && (
        <CharacterPicker
          currentCharId={currentCharId}
          onSelect={handleCharacterSelect}
          onClose={() => setShowCharPicker(false)}
        />
      )}

      {/* ── Profile modal ──────────────────────────────────── */}
      {showProfile && (
        <ProfileModal
          currentCharId={currentCharId}
          onSelectChar={() => { setShowProfile(false); setShowCharPicker(true) }}
          onClose={() => setShowProfile(false)}
          plots={ownedPlots}
          sceneSetName={(name) => {
            const scene = gameRef.current?.scene.getScene('WorldScene') as WorldScene | null
            scene?.setPlayerName(name)
          }}
        />
      )}

      {/* ── Alliance modal ────────────────────────────────── */}
      {showAlliance && (
        <AllianceModal
          wallet={publicKey?.toString() ?? null}
          onClose={() => setShowAlliance(false)}
        />
      )}

      {/* ── Trade modal ───────────────────────────────────── */}
      {showTrades && (
        <TradeModal
          wallet={publicKey?.toString() ?? null}
          onClose={() => setShowTrades(false)}
          onTradeComplete={() => {
            // Refresh plots after a trade
            fetch('/api/plots').then(r => r.json()).then(d => { if (Array.isArray(d)) onPlotsChange(d) })
          }}
        />
      )}

      {/* ── Achievement toast queue ───────────────────────── */}
      {currentAch && currentAchDef && (
        <AchievementToast
          icon={currentAchDef.icon}
          label={currentAchDef.label}
          desc={currentAchDef.desc}
          onDone={() => setAchQueue(prev => prev.slice(1))}
        />
      )}

      {/* ── Mobile D-pad ─────────────────────────────────── */}
      {isTouchDevice && !selectedPlot && (
        <MobileDPad />
      )}

      {/* ── Plot modal ────────────────────────────────────── */}
      {selectedPlot && (
        <PlotModal
          plot={selectedPlot}
          detail={plotDetail}
          loading={loadingPlot}
          onClose={() => { setSelectedPlot(null); setPlotDetail(null) }}
          onUpdate={handlePlotUpdate}
          goldenHour={goldenHour}
        />
      )}
    </div>
  )
}

// ── Mobile D-pad ─────────────────────────────────────────────────────────────
function MobileDPad() {
  const fire = (key: string, type: 'keydown' | 'keyup') => {
    window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }))
  }
  const mkBtn = (key: string, label: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); fire(key, 'keydown') },
    onPointerUp:   (e: React.PointerEvent) => { e.currentTarget.releasePointerCapture(e.pointerId); fire(key, 'keyup') },
    onPointerLeave:() => fire(key, 'keyup'),
    children: label,
  })

  const btnStyle: React.CSSProperties = {
    width:          52,
    height:         52,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    background:     'rgba(42,20,6,0.75)',
    border:         '3px solid #5c3317',
    boxShadow:      'inset 2px 2px 0 rgba(255,220,150,0.2), inset -2px -2px 0 rgba(0,0,0,0.4)',
    color:          '#f0d080',
    fontSize:       20,
    cursor:         'pointer',
    userSelect:     'none',
    touchAction:    'none',
  }

  return (
    <div style={{
      position:   'absolute',
      bottom:     90,
      left:       '50%',
      transform:  'translateX(-50%)',
      zIndex:     25,
      display:    'grid',
      gridTemplateColumns: '52px 52px 52px',
      gridTemplateRows:    '52px 52px 52px',
      gap:        4,
      opacity:    0.85,
    }}>
      {/* Row 1: [empty] [up] [empty] */}
      <div />
      <button style={btnStyle} {...mkBtn('w', '▲')} />
      <div />
      {/* Row 2: [left] [empty] [right] */}
      <button style={btnStyle} {...mkBtn('a', '◀')} />
      <div />
      <button style={btnStyle} {...mkBtn('d', '▶')} />
      {/* Row 3: [empty] [down] [empty] */}
      <div />
      <button style={btnStyle} {...mkBtn('s', '▼')} />
      <div />
    </div>
  )
}

// ── Reusable nav button ──────────────────────────────────────────────────────
function NavBtn({
  disabled, onClick, children, style,
}: {
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
  style: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        position:      'absolute',
        zIndex:        20,
        width:         44,
        height:        44,
        fontFamily:    '"Press Start 2P", monospace',
        fontSize:      16,
        display:       'flex',
        alignItems:    'center',
        justifyContent:'center',
        background:    disabled ? '#a07848' : '#d4a574',
        border:        '3px solid #3a1f0a',
        boxShadow:     disabled
                         ? 'none'
                         : 'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b, 3px 3px 0 #3a1f0a',
        color:         disabled ? '#6b4e30' : '#3a1f0a',
        cursor:        disabled ? 'not-allowed' : 'pointer',
        opacity:       disabled ? 0.5 : 1,
        transition:    'opacity 0.15s, filter 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
