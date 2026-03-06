'use client'

import { useEffect, useRef, useState } from 'react'

interface ChatMsg {
  id: number
  wallet: string
  message: string
  created_at: string
}

function WalletLink({ w, isYou }: { w: string; isYou: boolean }) {
  if (isYou) return <span style={{ fontWeight: 'bold' }}>You</span>
  if (!w || w.startsWith('guest_')) return <span>Guest</span>
  const short = `${w.slice(0, 4)}..${w.slice(-3)}`
  return (
    <a
      href={`https://solscan.io/account/${w}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}
      onClick={e => e.stopPropagation()}
    >{short}</a>
  )
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)  return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h`
}

interface Props {
  wallet: string
}

export default function LiveChat({ wallet }: Props) {
  const [msgs,       setMsgs]       = useState<ChatMsg[]>([])
  const [draft,      setDraft]      = useState('')
  const [sending,    setSending]    = useState(false)
  const [collapsed,  setCollapsed]  = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)

  // Poll messages every 5s
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch('/api/chat')
        if (!res.ok) return
        const data: ChatMsg[] = await res.json()
        if (alive) setMsgs(data.reverse())
      } catch { /* ignore */ }
    }
    load()
    const id = setInterval(load, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, collapsed])

  const send = async () => {
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet, message: draft.trim() }),
      })
      if (res.ok) {
        const msg: ChatMsg = await res.json()
        setMsgs(prev => [...prev, msg])
        setDraft('')
      }
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
      width:         220,
      zIndex:        20,
      display:       'flex',
      flexDirection: 'column',
      gap:           0,
      pointerEvents: 'all',
    }}>
      {/* Header */}
      <div
        className="pixel-panel-header"
        onClick={() => setCollapsed(v => !v)}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '5px 10px',
          cursor:         'pointer',
          borderBottom:   collapsed ? 'none' : '3px solid #5c3317',
          border:         '3px solid #5c3317',
          borderBottomWidth: collapsed ? 3 : 0,
          userSelect:     'none',
        }}
      >
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 7, color: '#3a1f0a' }}>
          LIVE CHAT
        </span>
        <span style={{ fontFamily: '"Press Start 2P", monospace', fontSize: 8, color: '#5c3317' }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <>
          {/* Messages */}
          <div style={{
            background:   '#e8c090',
            border:       '3px solid #5c3317',
            borderTop:    'none',
            borderBottom: 'none',
            height:       220,
            overflowY:    'auto',
            padding:      '6px 8px',
            display:      'flex',
            flexDirection:'column',
            gap:          5,
            scrollbarWidth: 'thin',
            scrollbarColor: '#8b5a2b #c8975a',
          }}>
            {msgs.length === 0 && (
              <div style={{ color: '#8b5a2b', fontSize: 9, fontFamily: 'system-ui', textAlign: 'center', marginTop: 20 }}>
                No messages yet.<br />Say hi!
              </div>
            )}
            {msgs.map(m => (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{
                    fontFamily: '"Press Start 2P", monospace',
                    fontSize:   6,
                    color:      m.wallet === wallet ? '#5c3317' : '#8b5a2b',
                    fontWeight: m.wallet === wallet ? 'bold' : 'normal',
                  }}>
                    <WalletLink w={m.wallet} isYou={m.wallet === wallet} />
                  </span>
                  <span style={{ fontSize: 8, color: '#a07840', fontFamily: 'system-ui' }}>
                    {timeAgo(m.created_at)}
                  </span>
                </div>
                <div style={{
                  background:   m.wallet === wallet ? '#d4a574' : '#c8975a',
                  border:       '2px solid #8b5a2b',
                  padding:      '3px 6px',
                  fontSize:     10,
                  color:        '#3a1f0a',
                  fontFamily:   'system-ui, sans-serif',
                  lineHeight:   1.4,
                  wordBreak:    'break-word',
                  boxShadow:    'inset 1px 1px 0 rgba(255,255,255,0.2)',
                }}>
                  {m.message}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            background:   '#d4a574',
            border:       '3px solid #5c3317',
            borderTop:    'none',
            padding:      '5px 6px',
            display:      'flex',
            gap:          5,
          }}>
            {wallet ? (
              <>
                <input
                  ref={inputRef}
                  className="pixel-input"
                  value={draft}
                  onChange={e => setDraft(e.target.value.slice(0, 120))}
                  onKeyDown={e => { if (e.key === 'Enter') send() }}
                  placeholder="Say something..."
                  style={{ flex: 1, fontSize: 8, minWidth: 0 }}
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  className="pixel-btn"
                  style={{ fontSize: 7, padding: '3px 7px', flexShrink: 0 }}
                >
                  {sending ? '..' : 'Send'}
                </button>
              </>
            ) : (
              <div style={{ fontSize: 8, color: '#5c3317', fontFamily: 'system-ui', textAlign: 'center', width: '100%', padding: '2px 0' }}>
                Connect wallet to chat
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
