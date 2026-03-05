'use client'

import { useEffect, useState } from 'react'

interface LeaderEntry {
  wallet:     string
  plots:      number
  score:      number
  topTier:    string
  topName:    string | null
  maxUpgrade: number
}

const TIER_COLOR: Record<string, string> = {
  diamond: '#00bfff',
  gold:    '#ffd700',
  silver:  '#c0c0c0',
  bronze:  '#cd7f32',
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardModal({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setEntries(d) : null)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/70 z-50"
      onClick={onClose}
    >
      <div
        className="pixel-panel w-[480px] max-w-[96vw] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-panel-header flex items-center justify-between p-4">
          <h2 className="font-bold text-base" style={{ color: 'var(--ui-text-dark)' }}>
            Land Grab — Leaderboard
          </h2>
          <button onClick={onClose} className="pixel-btn w-10 h-10 flex items-center justify-center text-xl">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--ui-tan-light)' }}>
          {loading ? (
            <div className="text-center py-8" style={{ color: 'var(--ui-dark)', fontSize: 12 }}>Loading...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--ui-dark)', fontSize: 12 }}>
              No farmers yet. Be the first!
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((e, i) => (
                <div
                  key={e.wallet}
                  className="pixel-inset"
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            10,
                    padding:        '8px 12px',
                    borderLeft:     `4px solid ${TIER_COLOR[e.topTier] ?? '#cd7f32'}`,
                  }}
                >
                  {/* Rank */}
                  <div style={{
                    width:      28,
                    textAlign:  'center',
                    fontSize:   i < 3 ? 18 : 11,
                    flexShrink: 0,
                    fontFamily: '"Press Start 2P", monospace',
                    color:      'var(--ui-text)',
                  }}>
                    {i < 3 ? MEDALS[i] : `#${i + 1}`}
                  </div>

                  {/* Wallet + plot name */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize:   9,
                      color:      'var(--ui-text-dark)',
                      overflow:   'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {e.topName ?? `${e.wallet.slice(0, 4)}...${e.wallet.slice(-4)}`}
                    </div>
                    <div style={{ fontSize: 8, color: 'var(--ui-dark)', marginTop: 2 }}>
                      {e.wallet.slice(0, 6)}...{e.wallet.slice(-4)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                      fontFamily: '"Press Start 2P", monospace',
                      fontSize:   10,
                      color:      TIER_COLOR[e.topTier] ?? '#cd7f32',
                    }}>
                      {e.score} pts
                    </div>
                    <div style={{ fontSize: 8, color: 'var(--ui-dark)', marginTop: 2 }}>
                      {e.plots} plot{e.plots !== 1 ? 's' : ''}
                      {e.maxUpgrade > 1 ? ` · Lv.${e.maxUpgrade}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scoring legend */}
          <div style={{
            marginTop:  16,
            padding:    '8px 12px',
            background: 'rgba(0,0,0,0.15)',
            fontSize:   8,
            color:      'var(--ui-dark)',
            fontFamily: '"Press Start 2P", monospace',
            lineHeight: 1.8,
          }}>
            Score: Diamond=100 · Gold=50 · Silver=20 · Bronze=10 pts/plot
          </div>
        </div>
      </div>
    </div>
  )
}
