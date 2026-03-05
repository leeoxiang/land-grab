'use client'

import { useState, useEffect } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import type { MarketOrder } from '@/types'
import { CROPS, ANIMALS } from '@/config/game'

const ALL_ITEMS: Record<string, { name: string; color: string }> = {
  ...Object.fromEntries(Object.entries(CROPS).map(([k, v])   => [k, { name: v.name,      color: v.color }])),
  ...Object.fromEntries(Object.entries(ANIMALS).map(([k, v]) => [k, { name: v.produces,  color: '#c8a060' }])),
  eggs:     { name: 'Eggs',     color: '#fffacd' },
  milk:     { name: 'Milk',     color: '#f0f0ff' },
  wool:     { name: 'Wool',     color: '#e8e8e8' },
  truffles: { name: 'Truffles', color: '#8b4513' },
  honey:    { name: 'Honey',    color: '#ffa500' },
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--ui-dark)', color: 'var(--ui-text)',
  border: '2px solid var(--ui-darkest)',
  boxShadow: 'inset 1px 1px 0 rgba(0,0,0,0.4)',
  fontFamily: '"Press Start 2P", monospace', fontSize: 11,
  padding: '6px 10px', width: '100%', outline: 'none',
}

export default function Marketplace({ onClose }: { onClose: () => void }) {
  const { publicKey } = useWallet()
  const [orders, setOrders]   = useState<MarketOrder[]>([])
  const [filter, setFilter]   = useState<{ item: string; type: 'buy' | 'sell' | 'all' }>({ item: '', type: 'all' })
  const [placing, setPlacing] = useState(false)
  const [form, setForm]       = useState({ itemType: 'wheat', quantity: 1, pricePerUnit: 10, orderType: 'sell' as 'buy' | 'sell' })

  const loadOrders = async () => {
    const params = new URLSearchParams()
    if (filter.item) params.set('item_type', filter.item)
    if (filter.type !== 'all') params.set('order_type', filter.type)
    const res  = await fetch(`/api/marketplace?${params}`)
    const data = await res.json()
    setOrders(Array.isArray(data) ? data : [])
  }

  useEffect(() => { loadOrders() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const placeOrder = async () => {
    if (!publicKey) return
    setPlacing(true)
    try {
      const res = await fetch('/api/marketplace', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, wallet: publicKey.toString() }),
      })
      if (res.ok) await loadOrders()
    } finally { setPlacing(false) }
  }

  const cancelOrder = async (orderId: string) => {
    await fetch(`/api/marketplace/${orderId}/cancel`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ wallet: publicKey?.toString() }),
    })
    await loadOrders()
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="pixel-panel w-[820px] max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-panel-header flex items-center justify-between px-6 py-4">
          <div>
            <h2 className="font-bold text-lg" style={{ color: 'var(--ui-text-dark)' }}>Marketplace</h2>
            <p className="text-sm" style={{ color: 'var(--ui-dark)' }}>Grand Exchange — buy and sell resources</p>
          </div>
          <button onClick={onClose} className="pixel-btn w-10 h-10 flex items-center justify-center text-xl">×</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Order book ─────────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: '3px solid var(--ui-dark)' }}>
            {/* Filters */}
            <div className="flex gap-3 p-4" style={{ borderBottom: '3px solid var(--ui-dark)', background: 'var(--ui-tan-mid)' }}>
              <select
                value={filter.item}
                onChange={e => setFilter(f => ({ ...f, item: e.target.value }))}
                style={{ ...INPUT_STYLE, flex: 1 }}
              >
                <option value="">All items</option>
                {Object.entries(ALL_ITEMS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>

              <div className="flex" style={{ border: '3px solid var(--ui-dark)', boxShadow: '2px 2px 0 var(--ui-darkest)' }}>
                {(['all', 'sell', 'buy'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilter(f => ({ ...f, type: t }))}
                    className="px-4 py-1 capitalize text-sm"
                    style={{
                      fontFamily: '"Press Start 2P", monospace',
                      background: filter.type === t ? 'var(--ui-darkest)' : 'var(--ui-tan)',
                      color:      filter.type === t ? 'var(--ui-text)'    : 'var(--ui-dark)',
                      borderRight: t !== 'buy' ? '2px solid var(--ui-dark)' : 'none',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders table */}
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--ui-tan-light)' }}>
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: 'var(--ui-tan-mid)', borderBottom: '2px solid var(--ui-dark)' }}>
                  <tr style={{ color: 'var(--ui-darkest)', fontSize: 11 }}>
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-left px-3 py-2">Type</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Price ea.</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8" style={{ color: 'var(--ui-dark)' }}>No orders found</td>
                    </tr>
                  )}
                  {orders.map((order, i) => {
                    const item  = ALL_ITEMS[order.item_type as keyof typeof ALL_ITEMS]
                    const isOwn = order.player_wallet === publicKey?.toString()
                    return (
                      <tr
                        key={order.id}
                        style={{
                          background: i % 2 === 0 ? 'var(--ui-tan-light)' : 'var(--ui-tan)',
                          borderBottom: '1px solid var(--ui-tan-mid)',
                        }}
                      >
                        <td className="px-3 py-2" style={{ color: 'var(--ui-text-dark)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 8, height: 8, background: item?.color ?? '#888', border: '1px solid rgba(0,0,0,0.4)', display: 'inline-block', flexShrink: 0 }} />
                            {item?.name ?? order.item_type}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="text-xs font-bold px-2 py-0.5"
                            style={order.order_type === 'sell'
                              ? { background: '#5c1a1a', color: '#ffaaaa', border: '1px solid #8b2a2a' }
                              : { background: '#1a3a1a', color: '#aaffaa', border: '1px solid #2a5a2a' }
                            }
                          >
                            {order.order_type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right" style={{ color: 'var(--ui-text-dark)' }}>{order.quantity}</td>
                        <td className="px-3 py-2 text-right font-bold" style={{ color: '#ffd700' }}>
                          {order.price_per_unit} USDC
                        </td>
                        <td className="px-3 py-2 text-right" style={{ color: 'var(--ui-dark)' }}>
                          {(order.quantity * order.price_per_unit).toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isOwn && (
                            <button
                              onClick={() => cancelOrder(order.id)}
                              className="text-xs px-2 py-0.5"
                              style={{ color: '#ff8888', fontFamily: '"Press Start 2P", monospace', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Place order panel ─────────────────────────────────────── */}
          <div className="w-72 p-5 flex flex-col gap-4" style={{ background: 'var(--ui-tan)' }}>
            <h3 className="font-bold" style={{ color: 'var(--ui-text-dark)' }}>Place Order</h3>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--ui-dark)' }}>Item</label>
              <select
                value={form.itemType}
                onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}
                style={INPUT_STYLE}
              >
                {Object.entries(ALL_ITEMS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
            </div>

            {/* Buy / Sell toggle */}
            <div className="flex" style={{ border: '3px solid var(--ui-dark)', boxShadow: '2px 2px 0 var(--ui-darkest)' }}>
              {(['sell', 'buy'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, orderType: t }))}
                  className="flex-1 py-2 text-sm capitalize font-bold"
                  style={{
                    fontFamily: '"Press Start 2P", monospace',
                    background: form.orderType === t
                      ? (t === 'sell' ? '#5c1a1a' : '#1a3a1a')
                      : 'var(--ui-tan-mid)',
                    color: form.orderType === t
                      ? (t === 'sell' ? '#ffcccc' : '#ccffcc')
                      : 'var(--ui-darkest)',
                    borderRight: t === 'sell' ? '2px solid var(--ui-dark)' : 'none',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--ui-dark)' }}>Quantity</label>
              <input
                type="number" min={1} value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                style={INPUT_STYLE}
              />
            </div>

            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--ui-dark)' }}>Price per unit (USDC)</label>
              <input
                type="number" min={0.01} step={0.01} value={form.pricePerUnit}
                onChange={e => setForm(f => ({ ...f, pricePerUnit: parseFloat(e.target.value) || 0 }))}
                style={INPUT_STYLE}
              />
            </div>

            {/* Summary */}
            <div className="pixel-inset p-3 text-sm space-y-1">
              <div className="flex justify-between" style={{ color: 'var(--ui-tan-light)' }}>
                <span>Subtotal</span>
                <span>{(form.quantity * form.pricePerUnit).toFixed(2)} USDC</span>
              </div>
              <div className="flex justify-between" style={{ color: 'var(--ui-tan-light)' }}>
                <span>Fee (2.5%)</span>
                <span style={{ color: '#ff8888' }}>-{(form.quantity * form.pricePerUnit * 0.025).toFixed(2)}</span>
              </div>
              <div
                className="flex justify-between font-bold pt-1 mt-1"
                style={{ borderTop: '2px solid var(--ui-darkest)', color: 'var(--ui-text)' }}
              >
                <span>{form.orderType === 'sell' ? 'You receive' : 'You pay'}</span>
                <span style={{ color: '#7fffb0' }}>
                  {form.orderType === 'sell'
                    ? (form.quantity * form.pricePerUnit * 0.975).toFixed(2)
                    : (form.quantity * form.pricePerUnit).toFixed(2)} USDC
                </span>
              </div>
            </div>

            {!publicKey ? (
              <p className="text-sm text-center" style={{ color: 'var(--ui-dark)' }}>Connect wallet to trade</p>
            ) : (
              <button
                onClick={placeOrder}
                disabled={placing}
                className="pixel-btn w-full py-3"
                style={form.orderType === 'sell'
                  ? { background: '#5c1a1a', borderColor: '#3a0a0a', color: '#ffcccc', boxShadow: 'inset 1px 1px 0 #8b2a2a, inset -1px -1px 0 #2a0808, 3px 3px 0 #1a0404' }
                  : { background: '#1a3a1a', borderColor: '#0a2a0a', color: '#ccffcc', boxShadow: 'inset 1px 1px 0 #2a5a2a, inset -1px -1px 0 #0a1a0a, 3px 3px 0 #041404' }
                }
              >
                {placing ? 'Placing...' : `Place ${form.orderType} order`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
