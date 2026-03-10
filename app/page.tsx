'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useGameWallet as useWallet } from '@/hooks/useGameWallet'
import ConnectButton from '@/components/ConnectButton'
import Marketplace from '@/components/Marketplace'
import MyPlotsPanel from '@/components/MyPlotsPanel'
import PixelIcon from '@/components/ui/PixelIcon'
import HowToPlay from '@/components/game/HowToPlay'
import MusicPlayer from '@/components/MusicPlayer'
import type { Plot } from '@/types'

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false })

const SOCIAL = [
  {
    label: 'GitHub',
    href:  'https://github.com/leeoxiang/land-grab',
    icon:  'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/6983ebadee1a5bb66150c566_69093cba0db485064d0267ca_68d5c1872568958fd78018bb_twitter%20(1).png',
  },
  {
    label: 'Pump.fun',
    href:  'https://pump.fun',
    icon:  'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69093cbeb0e0ed83a682a1c1_68d5c1872568958fd78018bb_twitter%20(1).png',
  },
  {
    label: 'Twitter',
    href:  'https://twitter.com',
    icon:  'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/69093cba0db485064d0267ca_68d5c1872568958fd78018bb_twitter.png',
  },
  {
    label: 'Medium',
    href:  'https://medium.com',
    icon:  'https://cdn.prod.website-files.com/69082c5061a39922df8ed3b6/6983eb56f1ca3d355dfdf898_medium.png',
  },
]

export default function Home() {
  const { publicKey } = useWallet()
  const [plots, setPlots]               = useState<Plot[]>([])
  const [showMarketplace, setShowMarket] = useState(false)
  const [showMyPlots, setShowMyPlots]   = useState(false)
  const [showHowTo, setShowHowTo]       = useState(() =>
    typeof window !== 'undefined' && !localStorage.getItem('farm:howto')
  )
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<{ openPlot: (id: number) => void } | null>(null)

  useEffect(() => {
    const load = (initial = false) =>
      fetch('/api/plots')
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) { setPlots(data); if (initial) setLoading(false) } })
        .catch(() => { if (initial) setLoading(false) })

    load(true)
    const id = setInterval(() => load(false), 20_000)
    return () => clearInterval(id)
  }, [])

  const myPlotCount = plots.filter(p => p.owner_wallet === publicKey?.toString()).length

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0a0804' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="hud-header flex items-center justify-between px-4 py-2 z-10 shrink-0 gap-3">

        {/* Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <PixelIcon icon="crops" size={22} />
          <div>
            <h1 style={{ color: '#e8c090', fontSize: 13, letterSpacing: 2, fontFamily: '"Press Start 2P", monospace', lineHeight: 1 }}>
              LAND GRAB
            </h1>
            <p className="hidden sm:block" style={{ color: '#5c3317', fontSize: 7, fontFamily: '"Press Start 2P", monospace', marginTop: 4, letterSpacing: 1 }}>
              SOLANA FARMING
            </p>
          </div>
        </div>

        {/* Nav buttons — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-2 flex-1 justify-center">
          {publicKey && (
            <>
              <button
                onClick={() => setShowMyPlots(true)}
                className="pixel-btn relative flex items-center gap-1.5 px-3 py-1.5"
                style={{ background: '#2d5a1b', borderColor: '#1a3a0d', color: '#ccffcc', boxShadow: 'inset 1px 1px 0 #3d8a2b, inset -1px -1px 0 #1a2a10, 3px 3px 0 #0a1a05', fontSize: 10 }}
              >
                <PixelIcon icon="home" size={12} />
                My Plots
                {myPlotCount > 0 && (
                  <span style={{ background: '#56db45', color: '#0a1a05', fontSize: 9, border: '2px solid #1a3a0d', padding: '1px 4px', fontFamily: '"Press Start 2P", monospace' }}>
                    {myPlotCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  const plot = plots.find(p => p.owner_wallet === publicKey.toString())
                  if (plot) window.dispatchEvent(new CustomEvent('farm:openPlot', { detail: plot }))
                }}
                className="pixel-btn flex items-center gap-1.5 px-3 py-1.5"
                style={{ background: '#2a3a5a', borderColor: '#1a2a3a', color: '#88ccff', boxShadow: 'inset 1px 1px 0 #3a5a8a, inset -1px -1px 0 #0a1a2a, 3px 3px 0 #0a1020', fontSize: 10 }}
              >
                <PixelIcon icon="farmer" size={12} />
                Plot Mgmt
              </button>
            </>
          )}
          <button
            onClick={() => setShowMarket(true)}
            className="pixel-btn flex items-center gap-1.5 px-3 py-1.5"
            style={{ background: '#7a5a00', borderColor: '#4a3500', color: '#ffe066', boxShadow: 'inset 1px 1px 0 #aa8800, inset -1px -1px 0 #3a2800, 3px 3px 0 #2a1a00', fontSize: 10 }}
          >
            <PixelIcon icon="coin" size={12} />
            Market
          </button>
          <button
            onClick={() => setShowHowTo(true)}
            className="pixel-btn px-3 py-1.5"
            style={{ background: '#3a2a0a', borderColor: '#1a1005', color: '#f0d080', fontSize: 12 }}
            title="How to Play"
          >?</button>
        </div>

        {/* Right cluster: social + music + wallet */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Social icons */}
          <div className="hidden sm:flex items-center gap-1">
            {SOCIAL.map(s => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                title={s.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.icon} alt={s.label} width={14} height={14} style={{ objectFit: 'contain' }} />
              </a>
            ))}
          </div>

          <div className="hud-divider hidden sm:block" />

          {/* Music controls */}
          <MusicPlayer />

          <div className="hud-divider" />

          {/* Wallet */}
          <ConnectButton />

          {/* Mobile-only: market + help buttons */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              onClick={() => setShowMarket(true)}
              className="pixel-btn px-2 py-1.5"
              style={{ background: '#7a5a00', borderColor: '#4a3500', color: '#ffe066', fontSize: 10 }}
            >
              <PixelIcon icon="coin" size={12} />
            </button>
            <button
              onClick={() => setShowHowTo(true)}
              className="pixel-btn px-2 py-1.5"
              style={{ background: '#3a2a0a', borderColor: '#1a1005', color: '#f0d080', fontSize: 12 }}
            >?</button>
          </div>
        </div>
      </header>

      {/* ── HUD stats bar ──────────────────────────────────────────────── */}
      <div className="hud-stats flex items-center shrink-0">
        <StatPip value={plots.length}                              label="plots"  color="#e8c090" />
        <div className="hud-stat-sep" />
        <StatPip value={plots.filter(p => !p.owner_wallet).length} label="free"   color="#7fffb0" />
        <div className="hud-stat-sep" />
        <StatPip value={plots.filter(p => p.owner_wallet).length}  label="owned"  color="#ffaa44" />
        {publicKey && myPlotCount > 0 && (
          <>
            <div className="hud-stat-sep" />
            <StatPip value={myPlotCount} label="mine" color="#88ccff" />
          </>
        )}
        <span className="ml-auto pr-4 hidden md:block" style={{ color: '#2a1508', fontSize: 8, fontFamily: '"Press Start 2P", monospace' }}>
          WASD · CLICK PLOT · ? HELP
        </span>
      </div>

      {/* ── Game canvas ────────────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full" style={{ background: '#0a0804' }}>
            <div className="text-center">
              <div className="flex justify-center mb-5">
                <div className="loading-pulse">
                  <PixelIcon icon="crops" size={48} />
                </div>
              </div>
              <p style={{ color: '#c8975a', fontSize: 10, fontFamily: '"Press Start 2P", monospace', letterSpacing: 3 }}>
                LOADING WORLD
              </p>
              <div className="loading-dots mt-4">
                <span /><span /><span />
              </div>
            </div>
          </div>
        ) : (
          <>
            <GameCanvas plots={plots} onPlotsChange={setPlots} />
            <div className="game-vignette" />
          </>
        )}
      </main>

      {showHowTo     && <HowToPlay onClose={() => { localStorage.setItem('farm:howto', '1'); setShowHowTo(false) }} />}
      {showMarketplace && <Marketplace onClose={() => setShowMarket(false)} />}

      {showMyPlots && (
        <MyPlotsPanel
          onClose={() => setShowMyPlots(false)}
          onManagePlot={(plotId) => {
            setShowMyPlots(false)
            const plot = plots.find(p => p.id === plotId)
            if (plot) setTimeout(() => window.dispatchEvent(new CustomEvent('farm:openPlot', { detail: plot })), 100)
          }}
        />
      )}
    </div>
  )
}

function StatPip({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1">
      <strong style={{ color, fontSize: 11, fontFamily: '"Press Start 2P", monospace' }}>{value}</strong>
      <span style={{ color: '#3a1e0a', fontSize: 8, fontFamily: '"Press Start 2P", monospace' }}>{label}</span>
    </div>
  )
}
