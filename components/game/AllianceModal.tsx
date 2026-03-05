'use client'

import { useState, useEffect } from 'react'
import type { Alliance } from '@/types'
import { ALLIANCE_MAX_MEMBERS } from '@/config/game'

interface Props {
  wallet: string | null
  onClose: () => void
}

export default function AllianceModal({ wallet, onClose }: Props) {
  const [alliances,     setAlliances]     = useState<(Alliance & { member_count: number; is_member: boolean })[]>([])
  const [myAllianceId,  setMyAllianceId]  = useState<number | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [creating,      setCreating]      = useState(false)
  const [name,          setName]          = useState('')
  const [tag,           setTag]           = useState('')
  const [err,           setErr]           = useState('')
  const [working,       setWorking]       = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/alliances?wallet=${wallet ?? ''}`)
      const data = await res.json()
      setAlliances(data.alliances ?? [])
      setMyAllianceId(data.myAllianceId ?? null)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [wallet])

  const handleCreate = async () => {
    if (!wallet) return
    setErr('')
    setWorking(true)
    try {
      const res  = await fetch('/api/alliances', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: name.trim(), tag: tag.trim(), wallet }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error); return }
      setCreating(false)
      setName(''); setTag('')
      load()
    } catch { setErr('Network error') }
    setWorking(false)
  }

  const handleJoin = async (allianceId: number) => {
    if (!wallet) return
    setErr('')
    setWorking(true)
    try {
      const res  = await fetch('/api/alliances/join', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ allianceId, wallet }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error); return }
      load()
    } catch { setErr('Network error') }
    setWorking(false)
  }

  const handleLeave = async () => {
    if (!wallet) return
    setErr('')
    setWorking(true)
    try {
      const res  = await fetch('/api/alliances/leave', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error); return }
      load()
    } catch { setErr('Network error') }
    setWorking(false)
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/75 z-[100]"
      onClick={onClose}
    >
      <div
        className="pixel-panel w-[520px] max-w-[96vw] max-h-[88vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-panel-header flex items-center justify-between p-4">
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--ui-text-dark)' }}>
              Alliances
            </h2>
            <p style={{ fontSize: 9, color: 'var(--ui-dark)', marginTop: 2 }}>
              Join a group · share +5% yield bonus · max {ALLIANCE_MAX_MEMBERS} members
            </p>
          </div>
          <button onClick={onClose} className="pixel-btn w-10 h-10 flex items-center justify-center text-xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--ui-tan-light)' }}>
          {err && (
            <div className="pixel-inset p-2 text-center" style={{ fontSize: 10, color: '#ff4444' }}>{err}</div>
          )}

          {/* My alliance status */}
          {myAllianceId && (
            <div className="pixel-inset p-3 flex items-center justify-between">
              <span style={{ fontSize: 10, color: 'var(--ui-text)' }}>
                You are in an alliance
              </span>
              <button
                onClick={handleLeave}
                disabled={working}
                className="pixel-btn px-3 py-1"
                style={{ fontSize: 9, background: '#4a1000', borderColor: '#2a0800', color: '#ff8866' }}
              >
                Leave
              </button>
            </div>
          )}

          {/* Create new */}
          {!myAllianceId && wallet && (
            <div className="pixel-inset p-3">
              {creating ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 10, color: 'var(--ui-text-dark)', marginBottom: 4 }}>Create Alliance</div>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Alliance name (max 32)"
                    maxLength={32}
                    className="pixel-input w-full"
                    style={{ fontSize: 10 }}
                  />
                  <input
                    value={tag}
                    onChange={e => setTag(e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="TAG (max 4)"
                    maxLength={4}
                    className="pixel-input"
                    style={{ fontSize: 10, width: 80 }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleCreate}
                      disabled={working || !name.trim() || !tag.trim()}
                      className="pixel-btn px-4 py-1"
                      style={{ fontSize: 9, background: '#2d5a1b', color: '#ccffcc' }}
                    >
                      {working ? '…' : 'Create'}
                    </button>
                    <button
                      onClick={() => setCreating(false)}
                      className="pixel-btn px-4 py-1"
                      style={{ fontSize: 9 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="pixel-btn w-full py-2"
                  style={{ fontSize: 10, background: '#2d5a1b', color: '#ccffcc' }}
                >
                  + Create New Alliance
                </button>
              )}
            </div>
          )}

          {/* Alliance list */}
          {loading ? (
            <div className="pixel-inset p-4 text-center" style={{ fontSize: 10, color: 'var(--ui-dark)' }}>Loading…</div>
          ) : alliances.length === 0 ? (
            <div className="pixel-inset p-4 text-center" style={{ fontSize: 10, color: 'var(--ui-dark)' }}>
              No alliances yet. Be the first!
            </div>
          ) : (
            alliances.map(a => (
              <div
                key={a.id}
                className="pixel-inset"
                style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
              >
                {/* Tag badge */}
                <div style={{
                  fontFamily: '"Press Start 2P", monospace',
                  fontSize:   8,
                  background: '#3a2a0a',
                  border:     '2px solid #5c3317',
                  color:      '#ffd700',
                  padding:    '3px 6px',
                  flexShrink: 0,
                }}>
                  [{a.tag}]
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: 'var(--ui-text-dark)', fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 9, color: 'var(--ui-dark)', marginTop: 2 }}>
                    {a.member_count}/{ALLIANCE_MAX_MEMBERS} members
                  </div>
                </div>
                {a.is_member ? (
                  <span style={{ fontSize: 9, color: '#7fffb0' }}>✓ Joined</span>
                ) : !myAllianceId && wallet && a.member_count < ALLIANCE_MAX_MEMBERS ? (
                  <button
                    onClick={() => handleJoin(a.id)}
                    disabled={working}
                    className="pixel-btn px-3 py-1"
                    style={{ fontSize: 9, background: '#2d5a1b', color: '#ccffcc' }}
                  >
                    {working ? '…' : 'Join'}
                  </button>
                ) : (
                  <span style={{ fontSize: 9, color: '#5c3317' }}>
                    {a.member_count >= ALLIANCE_MAX_MEMBERS ? 'Full' : ''}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '3px solid var(--ui-dark)', background: 'var(--ui-tan)' }}>
          <button onClick={onClose} className="pixel-btn w-full py-2">Close</button>
        </div>
      </div>
    </div>
  )
}
