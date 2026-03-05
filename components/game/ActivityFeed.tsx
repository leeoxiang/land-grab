'use client'

import { useEffect, useState, useRef } from 'react'
import type { PlotEvent } from '@/types'

const EVENT_LABELS: Record<string, { color: string; verb: string }> = {
  claim:          { color: '#7fffb0', verb: 'claimed'   },
  harvest_crop:   { color: '#f5c518', verb: 'harvested' },
  harvest_animal: { color: '#ffaa44', verb: 'collected' },
  harvest_tree:   { color: '#2ecc71', verb: 'harvested' },
  buy_animal:     { color: '#ff9966', verb: 'bought'    },
  plant_crop:     { color: '#7fffb0', verb: 'planted'   },
  plant_tree:     { color: '#2ecc71', verb: 'planted'   },
  upgrade:        { color: '#88ccff', verb: 'upgraded'  },
  fish:           { color: '#00bfff', verb: 'caught'    },
  trade_create:   { color: '#ffd700', verb: 'listed'    },
  trade_accept:   { color: '#ffd700', verb: 'traded'    },
  hire_farmer:    { color: '#cc88ff', verb: 'hired'     },
  abandon:        { color: '#888888', verb: 'abandoned' },
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
  const meta   = EVENT_LABELS[ev.event_type] ?? { color: '#aaa', verb: 'did something' }
  const who    = shortWallet(ev.wallet)
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
        className="pixel-btn"
        style={{
          position:   'absolute',
          bottom:     124,
          left:       12,
          zIndex:     20,
          fontSize:   8,
          padding:    '4px 8px',
        }}
      >
        FEED
      </button>
    )
  }

  return (
    <div
      style={{
        position:      'absolute',
        bottom:        124,
        left:          12,
        zIndex:        20,
        width:         220,
        maxHeight:     200,
        background:    '#e8c090',
        border:        '3px solid #5c3317',
        boxShadow:     'inset 2px 2px 0 #f0d0a0, inset -2px -2px 0 #8b5a2b, 3px 3px 0 #3a1f0a',
        display:       'flex',
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
          background:     '#c8975a',
          borderBottom:   '2px solid #5c3317',
          pointerEvents:  'auto',
        }}
      >
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#3a1f0a' }}>
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
              <span style={{
                flexShrink: 0, marginTop: 3,
                width: 7, height: 7,
                background: f.color,
                display: 'inline-block',
                imageRendering: 'pixelated',
                boxShadow: `0 0 3px ${f.color}66`,
              }} />
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
