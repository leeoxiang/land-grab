'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useWallet } from '@solana/wallet-adapter-react'
import ConnectButton from '@/components/ConnectButton'
import Marketplace from '@/components/Marketplace'
import MyPlotsPanel from '@/components/MyPlotsPanel'
import PixelIcon from '@/components/ui/PixelIcon'
import HowToPlay from '@/components/game/HowToPlay'
import type { Plot } from '@/types'

const GameCanvas = dynamic(() => import('@/components/game/GameCanvas'), { ssr: false })

export default function Home() {
  const { publicKey } = useWallet()
  const [plots, setPlots]               = useState<Plot[]>([])
  const [showMarketplace, setShowMarket] = useState(false)
  const [showMyPlots, setShowMyPlots]   = useState(false)
  const [showHowTo, setShowHowTo]       = useState(() =>
    typeof window !== 'undefined' && !localStorage.getItem('farm:howto')
  )
  const [loading, setLoading]           = useState(true)
  const canvasRef = useRef<{ openPlot: (id: number) => void } | null>(null)

  useEffect(() => {
    fetch('/api/plots')
      .then(r => r.json())
      .then(data => { setPlots(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const myPlotCount = plots.filter(p => p.owner_wallet === publicKey?.toString()).length

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#0a0804' }}>
      {/* Top nav */}
      <header
        className="flex items-center justify-between px-5 py-2 z-10 shrink-0"
        style={{ background: '#1a0f05', borderBottom: '4px solid #5c3317', boxShadow: '0 2px 0 #3a1f0a' }}
      >
        <div className="flex items-center gap-3">
          <PixelIcon icon="crops" size={20} />
          <h1 className="font-bold text-lg" style={{ color: 'var(--ui-tan-light)', letterSpacing: 1 }}>LAND GRAB</h1>
          <span className="text-sm hidden sm:block" style={{ color: '#5c3317' }}>· Solana Farming Game</span>
        </div>

        <div className="flex items-center gap-3">
          {publicKey && (
            <>
              <button
                onClick={() => setShowMyPlots(true)}
                className="pixel-btn relative flex items-center gap-2 px-4 py-2"
                style={{ background: '#2d5a1b', borderColor: '#1a3a0d', color: '#ccffcc', boxShadow: 'inset 1px 1px 0 #3d8a2b, inset -1px -1px 0 #1a2a10, 3px 3px 0 #0a1a05' }}
              >
                <PixelIcon icon="home" size={14} />
                My Plots
                {myPlotCount > 0 && (
                  <span
                    className="font-black leading-none px-1.5 py-0.5"
                    style={{ background: '#56db45', color: '#0a1a05', fontSize: 11, border: '2px solid #1a3a0d' }}
                  >
                    {myPlotCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  const plot = plots.find(p => p.owner_wallet === publicKey.toString())
                  if (plot) window.dispatchEvent(new CustomEvent('farm:openPlot', { detail: plot }))
                }}
                className="pixel-btn flex items-center gap-2 px-4 py-2"
                style={{ background: '#2a3a5a', borderColor: '#1a2a3a', color: '#88ccff', boxShadow: 'inset 1px 1px 0 #3a5a8a, inset -1px -1px 0 #0a1a2a, 3px 3px 0 #0a1020' }}
              >
                <PixelIcon icon="farmer" size={14} />
                Plot Management
              </button>
            </>
          )}
          <button
            onClick={() => setShowMarket(true)}
            className="pixel-btn flex items-center gap-2 px-4 py-2"
            style={{ background: '#7a5a00', borderColor: '#4a3500', color: '#ffe066', boxShadow: 'inset 1px 1px 0 #aa8800, inset -1px -1px 0 #3a2800, 3px 3px 0 #2a1a00' }}
          >
            <PixelIcon icon="coin" size={14} />
            Marketplace
          </button>
          <button
            onClick={() => setShowHowTo(true)}
            className="pixel-btn flex items-center gap-2 px-3 py-2"
            style={{ background: '#3a2a0a', borderColor: '#1a1005', color: '#f0d080' }}
            title="How to Play"
          >?</button>
          <ConnectButton />
        </div>
      </header>

      {/* Stats bar */}
      <div
        className="flex items-center gap-6 px-6 py-1.5 shrink-0"
        style={{ background: '#120a02', borderBottom: '3px solid #3a1f0a', fontSize: 13, color: 'var(--ui-tan-mid)' }}
      >
        <span><strong style={{ color: 'var(--ui-tan-light)' }}>{plots.length}</strong> <span style={{ color: '#5c3317' }}>plots</span></span>
        <span><strong style={{ color: '#7fffb0' }}>{plots.filter(p => !p.owner_wallet).length}</strong> <span style={{ color: '#5c3317' }}>available</span></span>
        <span><strong style={{ color: '#ffaa44' }}>{plots.filter(p => p.owner_wallet).length}</strong> <span style={{ color: '#5c3317' }}>owned</span></span>
        {publicKey && myPlotCount > 0 && (
          <span><strong style={{ color: '#7fffb0' }}>{myPlotCount}</strong> <span style={{ color: '#5c3317' }}>yours</span></span>
        )}
        <span className="ml-auto" style={{ color: '#3a1f0a', fontSize: 11 }}>WASD to walk · Click plot to open · ? for help</span>
      </div>

      {/* Game canvas */}
      <main className="flex-1 relative overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="mb-4 animate-bounce flex justify-center"><PixelIcon icon="crops" size={40} /></div>
              <p style={{ color: 'var(--ui-tan-mid)' }}>Loading world...</p>
            </div>
          </div>
        ) : (
          <GameCanvas plots={plots} onPlotsChange={setPlots} />
        )}
      </main>

      {showHowTo && <HowToPlay onClose={() => { localStorage.setItem('farm:howto', '1'); setShowHowTo(false) }} />}
      {showMarketplace && <Marketplace onClose={() => setShowMarket(false)} />}

      {showMyPlots && (
        <MyPlotsPanel
          onClose={() => setShowMyPlots(false)}
          onManagePlot={(plotId) => {
            setShowMyPlots(false)
            // Find and click the plot on the map by dispatching a custom event
            const plot = plots.find(p => p.id === plotId)
            if (plot) {
              // Small delay so the panel finishes closing first
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('farm:openPlot', { detail: plot }))
              }, 100)
            }
          }}
        />
      )}
    </div>
  )
}
