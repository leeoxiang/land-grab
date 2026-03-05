'use client'

import { useState, useEffect } from 'react'
import type { TradeOffer } from '@/types'
import { PLOT_TIERS } from '@/config/game'

interface Props {
  wallet:  string | null
  onClose: () => void
  onTradeComplete?: () => void
}

const TIER_COLOR: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', diamond: '#00bfff',
}

export default function TradeModal({ wallet, onClose, onTradeComplete }: Props) {
  const [offers,  setOffers]  = useState<TradeOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<number | null>(null)
  const [err,     setErr]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/trades?status=open')
      const data = await res.json()
      if (Array.isArray(data)) setOffers(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAccept = async (offerId: number) => {
    if (!wallet) return
    setErr('')
    setWorking(offerId)
    try {
      const res  = await fetch(`/api/trades/${offerId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'accept', wallet }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error); return }
      onTradeComplete?.()
      load()
    } catch { setErr('Network error') }
    setWorking(null)
  }

  const handleCancel = async (offerId: number) => {
    if (!wallet) return
    setErr('')
    setWorking(offerId)
    try {
      const res  = await fetch(`/api/trades/${offerId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'cancel', wallet }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error); return }
      load()
    } catch { setErr('Network error') }
    setWorking(null)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 z-[100]"
      onClick={onClose}
    >
      <div
        className="pixel-panel w-[560px] max-w-[96vw] max-h-[88vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="pixel-panel-header flex items-center justify-between p-4">
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--ui-text-dark)' }}>Plot Trading</h2>
            <p style={{ fontSize: 9, color: 'var(--ui-dark)', marginTop: 2 }}>
              Buy &amp; sell plots · Ownership transfers instantly
            </p>
          </div>
          <button onClick={onClose} className="pixel-btn w-10 h-10 flex items-center justify-center text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--ui-tan-light)' }}>
          {err && (
            <div className="pixel-inset p-2 text-center" style={{ fontSize: 10, color: '#ff4444' }}>{err}</div>
          )}

          {loading ? (
            <div className="pixel-inset p-4 text-center" style={{ fontSize: 10 }}>Loading offers…</div>
          ) : offers.length === 0 ? (
            <div className="pixel-inset p-4 text-center" style={{ fontSize: 10, color: 'var(--ui-dark)' }}>
              No open trade offers. List your plot from the Plot Management panel.
            </div>
          ) : offers.map(o => {
            const plot   = o.plot as Record<string, unknown> | undefined
            const tier   = (plot?.tier as string) ?? 'bronze'
            const tc     = TIER_COLOR[tier] ?? '#cd7f32'
            const label  = PLOT_TIERS[tier as keyof typeof PLOT_TIERS]?.label ?? tier
            const name   = (plot?.custom_name as string) || `Plot #${o.plot_id}`
            const col    = (plot?.col as number ?? 0) + 1
            const row    = (plot?.row as number ?? 0) + 1
            const lvl    = plot?.upgrade_level as number ?? 1
            const isOwn  = o.seller_wallet === wallet
            const busy   = working === o.id

            return (
              <div
                key={o.id}
                className="pixel-inset"
                style={{ padding: '10px 14px', display: 'flex', gap: 14, alignItems: 'center', borderLeft: `4px solid ${tc}` }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: tc, fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: 9, color: 'var(--ui-dark)', marginTop: 3 }}>
                    {label} · ({col},{row}) · Lv.{lvl}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--ui-dark)', marginTop: 2 }}>
                    Seller: {o.seller_wallet.slice(0, 4)}…{o.seller_wallet.slice(-3)}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 14, color: '#ffd700', fontWeight: 700 }}>
                    {o.price_usdc} USDC
                  </div>
                  {isOwn ? (
                    <button
                      onClick={() => handleCancel(o.id)}
                      disabled={busy}
                      className="pixel-btn px-3 py-1 mt-2"
                      style={{ fontSize: 9, background: '#4a1000', color: '#ff8866' }}
                    >
                      {busy ? '…' : 'Cancel'}
                    </button>
                  ) : wallet ? (
                    <button
                      onClick={() => handleAccept(o.id)}
                      disabled={busy}
                      className="pixel-btn px-3 py-1 mt-2"
                      style={{ fontSize: 9, background: '#2d5a1b', color: '#ccffcc' }}
                    >
                      {busy ? '…' : 'Buy'}
                    </button>
                  ) : (
                    <span style={{ fontSize: 9, color: '#5c3317' }}>Connect wallet</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '3px solid var(--ui-dark)', background: 'var(--ui-tan)' }}>
          <button onClick={onClose} className="pixel-btn w-full py-2">Close</button>
        </div>
      </div>
    </div>
  )
}
