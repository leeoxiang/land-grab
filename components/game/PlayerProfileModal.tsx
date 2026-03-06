'use client'

import { useEffect, useState } from 'react'
import { CHARACTER_DEFS } from '@/config/characters'

interface Props {
  wallet: string
  charId: string
  onClose: () => void
}

interface PlayerData {
  wallet: string
  balance: number
  plotCount: number
  plots: Array<{ id: number; tier: string; col: number; row: number }>
}

export default function PlayerProfileModal({ wallet, charId, onClose }: Props) {
  const [data, setData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)

  const isGuest = wallet.startsWith('guest_')
  const short   = isGuest ? 'Guest' : `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
  const def     = CHARACTER_DEFS.find(c => c.id === charId) ?? CHARACTER_DEFS[0]

  useEffect(() => {
    if (isGuest) { setLoading(false); return }
    fetch(`/api/player/plots?wallet=${wallet}`)
      .then(r => r.json())
      .then(plots => {
        setData({
          wallet,
          balance:   0,
          plotCount: Array.isArray(plots) ? plots.length : 0,
          plots:     Array.isArray(plots) ? plots : [],
        })
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [wallet, isGuest])

  const tierColor: Record<string, string> = {
    bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#88eeff',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="pixel-panel"
        style={{ width: 320, padding: 0, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: '#3a1f0a', padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 9, color: '#f0d080' }}>
            PLAYER PROFILE
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#f0d080',
              fontFamily: '"Press Start 2P", monospace', fontSize: 10, cursor: 'pointer',
            }}
          >✕</button>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Avatar + identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Sprite portrait */}
            <div style={{
              width: 56, height: 56, flexShrink: 0,
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
                transform: `scale(${Math.max(1, Math.floor(48 / def.frameHeight))})`,
                transformOrigin: 'top left',
              }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#3a1f0a', marginBottom: 6 }}>
                {def.label}
              </div>
              {isGuest ? (
                <div style={{ fontSize: 10, color: '#8b5a2b', fontFamily: 'system-ui' }}>Guest player</div>
              ) : (
                <a
                  href={`https://solscan.io/account/${wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 9, color: '#5c3317', fontFamily: 'monospace',
                    textDecoration: 'underline', wordBreak: 'break-all',
                  }}
                >
                  {short}
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          {!isGuest && (
            <div style={{
              background: '#f5deb3', border: '2px solid #8b5a2b',
              padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {loading ? (
                <div style={{ fontSize: 9, color: '#8b5a2b', fontFamily: 'system-ui', textAlign: 'center' }}>
                  Loading...
                </div>
              ) : (
                <>
                  <StatRow label="Plots owned" value={String(data?.plotCount ?? 0)} />
                  {data && data.plots.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
                      {data.plots.map(p => (
                        <span key={p.id} style={{
                          fontSize: 8, fontFamily: '"Press Start 2P", monospace',
                          color: tierColor[p.tier] ?? '#888',
                          background: '#3a1f0a', padding: '2px 5px',
                          border: `2px solid ${tierColor[p.tier] ?? '#888'}`,
                        }}>
                          {p.tier[0].toUpperCase()} ({p.col + 1},{p.row + 1})
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
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
                View on Solscan
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(wallet)
                }}
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 8, color: '#5c3317', fontFamily: 'system-ui' }}>{label}</span>
      <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#3a1f0a' }}>{value}</span>
    </div>
  )
}
