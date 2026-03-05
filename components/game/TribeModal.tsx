'use client'

import { useEffect, useState } from 'react'

interface TribeMember {
  wallet: string
  joined_at: string
}

interface Tribe {
  id: number
  name: string
  tag: string
  leader_wallet: string
  plot_id: number | null
  description: string | null
  invite_code: string
  created_at: string
  tribe_members: TribeMember[]
}

function shortWallet(w: string) {
  if (!w || w.length < 8) return w
  return w.slice(0, 4) + '…' + w.slice(-3)
}

const pf = '"Press Start 2P", monospace'

interface Props {
  wallet: string | null
  onClose: () => void
}

export default function TribeModal({ wallet, onClose }: Props) {
  const [tribe,    setTribe]    = useState<Tribe | null>(null)
  const [role,     setRole]     = useState<'leader' | 'member' | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'create' | 'join'>('create')
  const [msg,      setMsg]      = useState('')

  const [createName, setCreateName] = useState('')
  const [createTag,  setCreateTag]  = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joining,  setJoining]  = useState(false)
  const [joinErr,  setJoinErr]  = useState('')

  const load = async () => {
    if (!wallet) { setLoading(false); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/tribes?wallet=${wallet}`)
      const data = await res.json()
      setTribe(data.tribe ?? null)
      setRole(data.role ?? null)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [wallet])

  const flashMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const handleCreate = async () => {
    if (!wallet || !createName.trim() || !createTag.trim()) return
    setCreating(true); setCreateErr('')
    try {
      const res  = await fetch('/api/tribes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet, name: createName, tag: createTag, description: createDesc }),
      })
      const data = await res.json()
      if (data.error) { setCreateErr(data.error); return }
      flashMsg('Tribe created!')
      await load()
    } finally { setCreating(false) }
  }

  const handleJoin = async () => {
    if (!wallet || !joinCode.trim()) return
    setJoining(true); setJoinErr('')
    try {
      const res  = await fetch('/api/tribes/join', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ wallet, invite_code: joinCode }),
      })
      const data = await res.json()
      if (data.error) { setJoinErr(data.error); return }
      flashMsg(`Joined ${data.tribe_name}!`)
      await load()
    } finally { setJoining(false) }
  }

  const handleLeave = async () => {
    if (!wallet || !tribe || !confirm('Leave this tribe?')) return
    await fetch('/api/tribes/leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    })
    setTribe(null); setRole(null)
    flashMsg('Left tribe.')
  }

  const handleDisband = async () => {
    if (!wallet || !tribe || !confirm('Disband tribe? This cannot be undone.')) return
    await fetch(`/api/tribes/${tribe.id}?wallet=${wallet}`, { method: 'DELETE' })
    setTribe(null); setRole(null)
    flashMsg('Tribe disbanded.')
  }

  const handleKick = async (target: string) => {
    if (!wallet) return
    await fetch('/api/tribes/kick', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, target_wallet: target }),
    })
    flashMsg('Member removed.')
    await load()
  }

  const copyInvite = () => {
    if (!tribe) return
    navigator.clipboard.writeText(tribe.invite_code)
    flashMsg('Invite code copied!')
  }

  const memberCount   = tribe?.tribe_members.length ?? 0
  const leaderBonus   = `+${memberCount * 5}%`
  const memberBonus   = '+10%'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,10,0,0.72)' }}
      onClick={onClose}
    >
      <div
        className="pixel-panel"
        style={{ width: 380, maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: 'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b, 6px 6px 0 #3a1f0a', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pixel-panel-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '3px solid #5c3317' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Tribe/banner pixel icon */}
            <svg width="16" height="16" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
              <rect x="2" y="1"  width="2" height="14" fill="#5c3317"/>
              <rect x="4" y="2"  width="8" height="2"  fill="#ff9933"/>
              <rect x="4" y="4"  width="8" height="2"  fill="#ffd700"/>
              <rect x="4" y="6"  width="8" height="2"  fill="#ff9933"/>
              <rect x="12" y="2" width="1" height="6"  fill="#cc6600"/>
            </svg>
            <span style={{ fontFamily: pf, fontSize: 9, color: '#3a1f0a' }}>TRIBES</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5c3317', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {loading && (
            <div style={{ fontFamily: pf, fontSize: 8, color: '#8b5a2b', textAlign: 'center', padding: 20 }}>Loading…</div>
          )}

          {msg && (
            <div style={{ fontFamily: pf, fontSize: 7, color: '#2d5a1b', background: '#ccffcc', border: '2px solid #2d5a1b', padding: '6px 10px', marginBottom: 12, lineHeight: 1.5 }}>
              {msg}
            </div>
          )}

          {!loading && !wallet && (
            <div style={{ fontFamily: pf, fontSize: 8, color: '#8b5a2b', textAlign: 'center', padding: 20 }}>
              Connect wallet to use tribes
            </div>
          )}

          {/* ── IN A TRIBE ── */}
          {!loading && wallet && tribe && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Identity row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, background: '#c8975a', border: '3px solid #5c3317', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: pf, fontSize: 10, color: '#3a1f0a', flexShrink: 0 }}>
                  {tribe.tag}
                </div>
                <div>
                  <div style={{ fontFamily: pf, fontSize: 9, color: '#3a1f0a' }}>{tribe.name}</div>
                  <div style={{ fontFamily: pf, fontSize: 6, color: '#8b5a2b', marginTop: 4 }}>
                    Led by {tribe.leader_wallet === wallet ? 'You' : shortWallet(tribe.leader_wallet)}
                  </div>
                  {tribe.description && (
                    <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 9, color: '#5c3317', marginTop: 4, lineHeight: 1.4 }}>{tribe.description}</div>
                  )}
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <StatBox label="Members"    value={`${memberCount}/10`} />
                <StatBox label="Your Role"  value={role === 'leader' ? 'Leader' : 'Member'} />
                <StatBox label="Yield Bonus" value={role === 'leader' ? leaderBonus : memberBonus} highlight />
              </div>

              <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 9, color: '#5c3317', background: '#c8975a', border: '2px solid #8b5a2b', padding: '5px 8px', lineHeight: 1.5 }}>
                {role === 'leader'
                  ? `You earn +5% yield per active member. Current bonus: ${leaderBonus}.`
                  : 'Tribe members earn +10% yield on all harvests.'}
              </div>

              {/* Invite code (leader only) */}
              {role === 'leader' && (
                <div>
                  <div style={{ fontFamily: pf, fontSize: 6, color: '#5c3317', marginBottom: 5 }}>INVITE CODE</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#3a1f0a', background: '#c8975a', border: '2px solid #5c3317', padding: '4px 8px', letterSpacing: 3, userSelect: 'all' }}>
                      {tribe.invite_code}
                    </div>
                    <button onClick={copyInvite} className="pixel-btn" style={{ fontSize: 7, padding: '5px 8px', flexShrink: 0 }}>COPY</button>
                  </div>
                  <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 9, color: '#8b5a2b', marginTop: 4 }}>Share this code to invite followers</div>
                </div>
              )}

              {/* Members list */}
              <div>
                <div style={{ fontFamily: pf, fontSize: 6, color: '#5c3317', marginBottom: 7 }}>MEMBERS ({memberCount})</div>
                {memberCount === 0 && (
                  <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 9, color: '#8b5a2b' }}>No members yet — share your invite code!</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {tribe.tribe_members.map(m => (
                    <div key={m.wallet} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', background: '#c8975a', border: '2px solid #8b5a2b' }}>
                      <span style={{ fontFamily: pf, fontSize: 7, color: '#3a1f0a' }}>{shortWallet(m.wallet)}</span>
                      {role === 'leader' && m.wallet !== wallet && (
                        <button
                          onClick={() => handleKick(m.wallet)}
                          style={{ fontFamily: pf, fontSize: 6, background: '#8b2020', border: '2px solid #5c1010', color: '#ffaaaa', cursor: 'pointer', padding: '2px 6px' }}
                        >
                          KICK
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {role === 'member' && (
                  <button onClick={handleLeave} className="pixel-btn" style={{ flex: 1, fontSize: 7, background: '#5c3317', borderColor: '#3a1f0a', color: '#f0d080' }}>
                    LEAVE TRIBE
                  </button>
                )}
                {role === 'leader' && (
                  <button onClick={handleDisband} className="pixel-btn" style={{ flex: 1, fontSize: 7, background: '#8b2020', borderColor: '#5c1010', color: '#ffaaaa' }}>
                    DISBAND
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── NOT IN A TRIBE ── */}
          {!loading && wallet && !tribe && (
            <>
              {/* Tab bar */}
              <div style={{ display: 'flex', marginBottom: 14, border: '3px solid #5c3317' }}>
                {(['create', 'join'] as const).map((t, i) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: '7px 0',
                      fontFamily: pf, fontSize: 7,
                      background: tab === t ? '#c8975a' : '#d4a574',
                      border: 'none',
                      borderRight: i === 0 ? '2px solid #5c3317' : 'none',
                      color: tab === t ? '#3a1f0a' : '#8b5a2b',
                      cursor: 'pointer',
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>

              {tab === 'create' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 10, color: '#5c3317', lineHeight: 1.6, background: '#c8975a', border: '2px solid #8b5a2b', padding: '6px 10px' }}>
                    Create a tribe and recruit followers. As leader you earn <strong>+5% yield per member</strong>. Members earn <strong>+10% on all harvests</strong>.
                  </div>

                  <FormField label="TRIBE NAME (max 32)">
                    <input
                      className="pixel-input"
                      value={createName}
                      onChange={e => setCreateName(e.target.value.slice(0, 32))}
                      placeholder="e.g. Sol Farmers"
                      style={{ width: '100%', fontSize: 9 }}
                    />
                  </FormField>

                  <FormField label="TAG (2-4 CHARS)">
                    <input
                      className="pixel-input"
                      value={createTag}
                      onChange={e => setCreateTag(e.target.value.slice(0, 4).toUpperCase())}
                      placeholder="SOLX"
                      style={{ width: 90, fontSize: 9 }}
                    />
                  </FormField>

                  <FormField label="DESCRIPTION (optional)">
                    <input
                      className="pixel-input"
                      value={createDesc}
                      onChange={e => setCreateDesc(e.target.value.slice(0, 120))}
                      placeholder="About your tribe..."
                      style={{ width: '100%', fontSize: 9 }}
                    />
                  </FormField>

                  {createErr && <div style={{ fontFamily: pf, fontSize: 7, color: '#cc2020' }}>{createErr}</div>}

                  <button
                    onClick={handleCreate}
                    disabled={creating || !createName.trim() || !createTag.trim()}
                    className="pixel-btn"
                    style={{ fontSize: 8, padding: 10 }}
                  >
                    {creating ? 'Creating…' : 'CREATE TRIBE'}
                  </button>
                </div>
              )}

              {tab === 'join' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 10, color: '#5c3317', lineHeight: 1.6, background: '#c8975a', border: '2px solid #8b5a2b', padding: '6px 10px' }}>
                    Got an invite code from a KOL or friend? Enter it below to join their tribe and start earning yield bonuses.
                  </div>

                  <FormField label="INVITE CODE">
                    <input
                      className="pixel-input"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.trim())}
                      placeholder="8-char code"
                      style={{ width: '100%', fontSize: 9, letterSpacing: 2 }}
                    />
                  </FormField>

                  {joinErr && <div style={{ fontFamily: pf, fontSize: 7, color: '#cc2020' }}>{joinErr}</div>}

                  <button
                    onClick={handleJoin}
                    disabled={joining || !joinCode.trim()}
                    className="pixel-btn"
                    style={{ fontSize: 8, padding: 10 }}
                  >
                    {joining ? 'Joining…' : 'JOIN TRIBE'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ background: '#c8975a', border: '2px solid #8b5a2b', padding: '5px 8px' }}>
      <div style={{ fontFamily: pf, fontSize: 5, color: '#8b5a2b', marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: pf, fontSize: 8, color: highlight ? '#2d5a1b' : '#3a1f0a' }}>{value}</div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: pf, fontSize: 6, color: '#5c3317', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}
