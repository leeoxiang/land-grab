'use client'

import { useEffect, useState, useRef } from 'react'
import type { PlotEvent } from '@/types'

const EVENT_LABELS: Record<string, { icon: string; verb: string; color: string }> = {
  claim:          { icon: '🏠', verb: 'claimed',    color: '#7fffb0' },
  harvest_crop:   { icon: '🌾', verb: 'harvested',  color: '#f5c518' },
  harvest_animal: { icon: '🐄', verb: 'collected',  color: '#ffaa44' },
  harvest_tree:   { icon: '🌳', verb: 'harvested',  color: '#2ecc71' },
  buy_animal:     { icon: '🐑', verb: 'bought',     color: '#ff9966' },
  plant_crop:     { icon: '🌱', verb: 'planted',    color: '#7fffb0' },
  plant_tree:     { icon: '🌲', verb: 'planted',    color: '#2ecc71' },
  upgrade:        { icon: '⬆️',  verb: 'upgraded',   color: '#88ccff' },
  fish:           { icon: '🎣', verb: 'caught',     color: '#00bfff' },
  trade_create:   { icon: '💰', verb: 'listed',     color: '#ffd700' },
  trade_accept:   { icon: '🤝', verb: 'traded',     color: '#ffd700' },
  hire_farmer:    { icon: '👨‍🌾', verb: 'hired',      color: '#cc88ff' },
  abandon:        { icon: '💨', verb: 'abandoned',  color: '#888' },
}

function shortWallet(w: string | null) {
  if (!w) return 'Someone'
  return w.slice(0, 4) + '…' + w.slice(-3)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60)  return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

function formatEvent(ev: PlotEvent) {
  const meta  = EVENT_LABELS[ev.event_type] ?? { icon: '📋', verb: 'did something', color: '#aaa' }
  const who   = shortWallet(ev.wallet)
  const detail = ev.detail ?? {}
  const item   = (detail.item_type as string) ?? (detail.crop_type as string) ?? (detail.animal_type as string) ?? ''
  const plot   = ev.plot_id ? `Plot #${ev.plot_id}` : ''

  return { ...meta, text: `${who} ${meta.verb}${item ? ` ${item}` : ''}${plot ? ` on ${plot}` : ''}` }
}

export default function ActivityFeed() {
  const [events,  setEvents]  = useState<PlotEvent[]>([])
  const [visible, setVisible] = useState(true)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res  = await fetch('/api/events?limit=20')
        const data = await res.json()
        if (Array.isArray(data)) setEvents(data)
      } catch {}
    }
    load()
    const id = setInterval(load, 8000)
    return () => clearInterval(id)
  }, [])

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position:   'absolute',
          bottom:     80,
          right:      80,
          zIndex:     20,
          background: '#1a0f05',
          border:     '3px solid #5c3317',
          color:      '#a07840',
          fontSize:   10,
          padding:    '4px 8px',
          cursor:     'pointer',
          fontFamily: '"Press Start 2P", monospace',
        }}
      >
        FEED
      </button>
    )
  }

  return (
    <div
      style={{
        position:  'absolute',
        bottom:    80,
        right:     80,
        zIndex:    20,
        width:     240,
        maxHeight: 220,
        background: 'rgba(10,5,0,0.88)',
        border:    '3px solid #3a1f0a',
        boxShadow: '3px 3px 0 #1a0a00',
        display:   'flex',
        flexDirection: 'column',
        pointerEvents: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '4px 8px',
          background:     '#1a0a00',
          borderBottom:   '2px solid #3a1f0a',
          pointerEvents:  'auto',
        }}
      >
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#a07840' }}>
          LIVE FEED
        </span>
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', color: '#5c3317', cursor: 'pointer', fontSize: 12, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Events */}
      <div
        ref={listRef}
        style={{ overflowY: 'auto', padding: '4px 6px', display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        {events.length === 0 && (
          <span style={{ fontSize: 9, color: '#5c3317', fontStyle: 'italic', padding: 4 }}>
            No activity yet…
          </span>
        )}
        {events.map(ev => {
          const f = formatEvent(ev)
          return (
            <div key={ev.id} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
              <span style={{ fontSize: 9, color: f.color, lineHeight: 1.4, flex: 1 }}>
                {f.text}
              </span>
              <span style={{ fontSize: 8, color: '#5c3317', flexShrink: 0, marginTop: 2 }}>
                {timeAgo(ev.created_at)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
