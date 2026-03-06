'use client'

import { useEffect, useRef, useState } from 'react'
import { getPlayerName } from '@/config/characters'

interface ChatMsg {
  id: number
  wallet: string
  message: string
  created_at: string
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

function shortWallet(w: string) {
  if (!w || w.startsWith('guest_')) return 'Guest'
  return `${w.slice(0, 4)}..${w.slice(-3)}`
}

interface Props {
  wallet: string
}

export default function LiveChat({ wallet }: Props) {
  const [msgs,      setMsgs]      = useState<ChatMsg[]>([])
  const [draft,     setDraft]     = useState('')
  const [sending,   setSending]   = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [sendErr,   setSendErr]   = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  const isGuest    = wallet.startsWith('guest_')
  const playerName = getPlayerName()

  // Poll messages every 4s
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res  = await fetch('/api/chat')
        const data = await res.json()
        if (!res.ok) { if (alive) setError(data.error ?? `HTTP ${res.status}`); return }
        if (alive) { setMsgs(Array.isArray(data) ? data : []); setError(null) }
      } catch (e) {
        if (alive) setError(String(e))
      }
    }
    load()
    const id = setInterval(load, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Scroll to bottom on new messages when open
  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, collapsed])

  const send = async () => {
    if (!draft.trim() || sending) return
    setSending(true)
    setSendErr(null)
    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet, message: draft.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setMsgs(prev => [...prev, data as ChatMsg])
        setDraft('')
      } else {
        setSendErr(data.error ?? `Error ${res.status}`)
        setTimeout(() => setSendErr(null), 3000)
      }
    } catch (e) {
      setSendErr(String(e))
      setTimeout(() => setSendErr(null), 3000)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div style={{
      position:      'absolute',
      left:          'calc(50% - 250px)',
      bottom:        0,
      width:         230,
      zIndex:        20,
      display:       'flex',
      flexDirection: 'column',
      pointerEvents: 'all',
    }}>
      {/* ── Header ── */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{
          background:     '#2a1508',
          border:         '3px solid #5c3317',
          borderBottom:   collapsed ? '3px solid #5c3317' : 'none',
          padding:        '6px 10px',
          cursor:         'pointer',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          userSelect:     'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {/* live dot */}
          <div style={{
            width: 5, height: 5, borderRadius: '50%',
            background: error ? '#ff4444' : '#44ff88',
            boxShadow: `0 0 4px ${error ? '#ff4444' : '#44ff88'}`,
          }} />
          <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#f0d080' }}>
            LIVE CHAT
          </span>
          {msgs.length > 0 && collapsed && (
            <span style={{ fontSize: 8, color: '#8b5a2b', fontFamily: 'system-ui' }}>
              ({msgs.length})
            </span>
          )}
        </div>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#8b5a2b' }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <>
          {/* ── Error banner ── */}
          {error && (
            <div style={{
              background: '#3a0808', border: '3px solid #aa2222', borderTop: 'none', borderBottom: 'none',
              padding: '5px 8px', fontSize: 8, color: '#ff8888', fontFamily: 'system-ui',
            }}>
              ⚠ Chat unavailable — run CREATE TABLE chat_messages in Supabase SQL editor
            </div>
          )}

          {/* ── Messages ── */}
          <div style={{
            background:    '#1a1008',
            border:        '3px solid #5c3317',
            borderTop:     'none',
            borderBottom:  'none',
            height:        200,
            overflowY:     'auto',
            padding:       '8px',
            display:       'flex',
            flexDirection: 'column',
            gap:           6,
            scrollbarWidth: 'thin',
            scrollbarColor: '#3a2010 #0f0806',
          }}>
            {!error && msgs.length === 0 && (
              <div style={{ color: '#3a2a18', fontSize: 9, fontFamily: 'system-ui', textAlign: 'center', marginTop: 16 }}>
                No messages yet — say hi!
              </div>
            )}
            {msgs.map(m => {
              const isOwn = m.wallet === wallet
              const name  = isOwn ? playerName : shortWallet(m.wallet)
              return (
                <div key={m.id}>
                  {/* Sender + time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
                    <span style={{
                      fontFamily: '"Press Start 2P", monospace', fontSize: 6,
                      color: isOwn ? '#f0c040' : '#8b6a4a',
                    }}>
                      {isOwn ? (
                        name
                      ) : (
                        <a
                          href={`https://solscan.io/account/${m.wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'inherit', textDecoration: 'underline' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {name}
                        </a>
                      )}
                    </span>
                    <span style={{ fontSize: 9, color: '#3a2810', fontFamily: 'system-ui' }}>
                      {timeAgo(m.created_at)}
                    </span>
                  </div>
                  {/* Bubble */}
                  <div style={{
                    background:  isOwn ? '#2d4a1a' : '#1f1508',
                    border:      `1px solid ${isOwn ? '#3d6a2a' : '#3a2010'}`,
                    padding:     '4px 8px',
                    fontSize:    11,
                    color:       isOwn ? '#c8f0a0' : '#c8a878',
                    fontFamily:  'system-ui, sans-serif',
                    lineHeight:  1.4,
                    wordBreak:   'break-word',
                  }}>
                    {m.message}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* ── Send error ── */}
          {sendErr && (
            <div style={{
              background: '#3a0808', border: '3px solid #aa2222', borderTop: 'none', borderBottom: 'none',
              padding: '3px 8px', fontSize: 8, color: '#ff8888', fontFamily: 'system-ui',
            }}>
              {sendErr}
            </div>
          )}

          {/* ── Input ── */}
          <div style={{
            background:  '#160e04',
            border:      '3px solid #5c3317',
            borderTop:   'none',
            padding:     '6px',
            display:     'flex',
            gap:         5,
          }}>
            {!isGuest ? (
              <>
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value.slice(0, 120))}
                  onKeyDown={e => { if (e.key === 'Enter') send() }}
                  placeholder="Say something..."
                  style={{
                    flex: 1, minWidth: 0, fontSize: 11,
                    background: '#0f0804', border: '1px solid #3a2010',
                    color: '#e8c878', padding: '4px 7px',
                    fontFamily: 'system-ui',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  style={{
                    fontSize: 7, padding: '4px 8px', flexShrink: 0,
                    fontFamily: '"Press Start 2P", monospace',
                    background: draft.trim() && !sending ? '#2d5a1b' : '#1a1008',
                    border: '2px solid #3d6a2a',
                    color: draft.trim() && !sending ? '#a0e060' : '#3a4a2a',
                    cursor: draft.trim() && !sending ? 'pointer' : 'default',
                  }}
                >
                  {sending ? '...' : '▶'}
                </button>
              </>
            ) : (
              <div style={{ fontSize: 8, color: '#3a2810', fontFamily: 'system-ui', textAlign: 'center', width: '100%', padding: '3px 0' }}>
                Connect wallet to chat
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
