'use client'

import { useEffect, useState, useRef } from 'react'

interface TribeMember { wallet: string; joined_at: string }

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

const pf = '"Press Start 2P", monospace'
const sf = 'system-ui, sans-serif'

function shortWallet(w: string) {
  if (!w || w.length < 8) return w
  return `${w.slice(0, 4)}…${w.slice(-3)}`
}

function power(t: Tribe) {
  return t.tribe_members.length * 100
}

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32']

interface Props {
  wallet: string | null
  onClose: () => void
}

export default function TribeModal({ wallet, onClose }: Props) {
  const [tab,      setTab]      = useState<'board' | 'mine'>('board')
  const [tribes,   setTribes]   = useState<Tribe[]>([])
  const [myTribe,  setMyTribe]  = useState<Tribe | null>(null)
  const [myRole,   setMyRole]   = useState<'leader' | 'member' | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [listLoad, setListLoad] = useState(true)
  const [search,   setSearch]   = useState('')
  const [msg,      setMsg]      = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [createName, setCreateName] = useState('')
  const [createTag,  setCreateTag]  = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating,   setCreating]   = useState(false)
  const [createErr,  setCreateErr]  = useState('')

  const [joinCode, setJoinCode] = useState('')
  const [joining,  setJoining]  = useState(false)
  const [joinErr,  setJoinErr]  = useState('')

  const [joiningId, setJoiningId] = useState<number | null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const loadMine = async () => {
    if (!wallet) { setLoading(false); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/tribes?wallet=${wallet}`)
      const data = await res.json()
      setMyTribe(data.tribe ?? null)
      setMyRole(data.role ?? null)
    } catch {}
    setLoading(false)
  }

  const loadList = async (q = '') => {
    setListLoad(true)
    try {
      const res  = await fetch(`/api/tribes/list?search=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (Array.isArray(data)) setTribes(data)
    } catch {}
    setListLoad(false)
  }

  useEffect(() => { loadMine(); loadList() }, [wallet])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => loadList(search), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search])

  const handleCreate = async () => {
    if (!wallet || !createName.trim() || !createTag.trim()) return
    setCreating(true); setCreateErr('')
    try {
      const res  = await fetch('/api/tribes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, name: createName, tag: createTag, description: createDesc }),
      })
      const data = await res.json()
      if (data.error) { setCreateErr(data.error); return }
      flash('Tribe created!'); await loadMine(); loadList(search); setTab('mine')
    } finally { setCreating(false) }
  }

  const handleJoinByCode = async () => {
    if (!wallet || !joinCode.trim()) return
    setJoining(true); setJoinErr('')
    try {
      const res  = await fetch('/api/tribes/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, invite_code: joinCode }),
      })
      const data = await res.json()
      if (data.error) { setJoinErr(data.error); return }
      flash(`Joined ${data.tribe_name}!`); await loadMine(); loadList(search); setTab('mine')
    } finally { setJoining(false) }
  }

  const handleJoinTribe = async (t: Tribe) => {
    if (!wallet) return
    setJoiningId(t.id)
    try {
      const res  = await fetch('/api/tribes/join', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet, invite_code: t.invite_code }),
      })
      const data = await res.json()
      if (data.error) { flash(data.error); return }
      flash(`Joined ${t.name}!`); await loadMine(); loadList(search); setTab('mine')
    } finally { setJoiningId(null) }
  }

  const handleLeave = async () => {
    if (!wallet || !myTribe || !confirm('Leave tribe?')) return
    await fetch('/api/tribes/leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet }),
    })
    setMyTribe(null); setMyRole(null); flash('Left tribe.'); loadList(search)
  }

  const handleDisband = async () => {
    if (!wallet || !myTribe || !confirm('Disband tribe? Cannot be undone.')) return
    await fetch(`/api/tribes/${myTribe.id}?wallet=${wallet}`, { method: 'DELETE' })
    setMyTribe(null); setMyRole(null); flash('Tribe disbanded.'); loadList(search)
  }

  const handleKick = async (target: string) => {
    if (!wallet) return
    await fetch('/api/tribes/kick', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, target_wallet: target }),
    })
    await loadMine()
  }

  const copyInvite = () => {
    if (myTribe) { navigator.clipboard.writeText(myTribe.invite_code); flash('Code copied!') }
  }

  const userInAnyTribe = !!myTribe

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(20,10,0,0.75)' }}
      onClick={onClose}
    >
      <div
        style={{ width: 440, maxHeight: '88vh', display: 'flex', flexDirection: 'column', background: '#e8c090', border: '4px solid #3a1f0a', boxShadow: 'inset 2px 2px 0 #f5d8a8, inset -2px -2px 0 #8b5a2b, 8px 8px 0 #1a0a00', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{ background: '#5c3317', padding: '8px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid #3a1f0a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
              <rect x="3" y="1" width="2" height="13" fill="#f0d080"/>
              <rect x="5" y="2" width="8" height="2"  fill="#ff9933"/>
              <rect x="5" y="4" width="8" height="2"  fill="#ffd700"/>
              <rect x="5" y="6" width="8" height="2"  fill="#ff9933"/>
              <rect x="1" y="12" width="2" height="2" fill="#f0d080"/>
              <rect x="5" y="12" width="2" height="2" fill="#f0d080"/>
              <rect x="9" y="12" width="2" height="2" fill="#f0d080"/>
            </svg>
            <span style={{ fontFamily: pf, fontSize: 10, color: '#f0d080', letterSpacing: 1 }}>TRIBES</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#f0d080', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>

        {/* Search + tabs */}
        <div style={{ background: '#d4a574', borderBottom: '2px solid #5c3317', padding: '10px 14px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#e8c090', border: '3px solid #5c3317', padding: '5px 10px', boxShadow: 'inset 2px 2px 0 #c8975a' }}>
            <svg width="11" height="11" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
              <rect x="4"  y="1"  width="6" height="2" fill="#5c3317"/>
              <rect x="2"  y="3"  width="2" height="6" fill="#5c3317"/>
              <rect x="10" y="3"  width="2" height="6" fill="#5c3317"/>
              <rect x="4"  y="9"  width="6" height="2" fill="#5c3317"/>
              <rect x="9"  y="10" width="2" height="2" fill="#5c3317"/>
              <rect x="11" y="12" width="2" height="2" fill="#5c3317"/>
              <rect x="13" y="14" width="2" height="2" fill="#5c3317"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tribes..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: pf, fontSize: 8, color: '#3a1f0a' }}
            />
          </div>
          <div style={{ display: 'flex', marginTop: 8 }}>
            {([['board', 'LEADERBOARD'], ['mine', 'MY TRIBE']] as const).map(([key, label], i) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: '8px 0',
                  fontFamily: pf, fontSize: 7,
                  background: tab === key ? '#e8c090' : '#c8975a',
                  border: 'none',
                  borderTop: tab === key ? '3px solid #ffd700' : '3px solid transparent',
                  borderRight: i === 0 ? '2px solid #5c3317' : 'none',
                  color: tab === key ? '#3a1f0a' : '#8b5a2b',
                  cursor: 'pointer',
                }}
              >
                {label}
                {key === 'mine' && myTribe && <span style={{ marginLeft: 6, fontSize: 5, color: '#ffd700' }}>●</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Flash */}
        {msg && (
          <div style={{ background: '#2d5a1b', borderBottom: '2px solid #1a3a0d', padding: '6px 14px', fontFamily: pf, fontSize: 7, color: '#ccffcc' }}>
            {msg}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#8b5a2b #c8975a' }}>

          {/* ══ LEADERBOARD ══ */}
          {tab === 'board' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '34px 54px 1fr 68px 68px', padding: '7px 14px', background: '#c8975a', borderBottom: '2px solid #5c3317' }}>
                {['#', 'TAG', 'NAME', 'MEMBERS', 'POWER'].map(h => (
                  <span key={h} style={{ fontFamily: pf, fontSize: 6, color: '#5c3317' }}>{h}</span>
                ))}
              </div>

              {listLoad && <div style={{ padding: 24, textAlign: 'center', fontFamily: pf, fontSize: 8, color: '#8b5a2b' }}>Loading…</div>}

              {!listLoad && tribes.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', fontFamily: pf, fontSize: 8, color: '#8b5a2b' }}>
                  {search ? 'No tribes found' : 'No tribes yet — be the first!'}
                </div>
              )}

              {!listLoad && tribes.map((t, i) => {
                const isMyTribe = myTribe?.id === t.id
                const isMember  = !isMyTribe && userInAnyTribe
                const full      = t.tribe_members.length >= 10
                const pow       = power(t)
                const rc        = i < 3 ? RANK_COLORS[i] : '#8b5a2b'

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '34px 54px 1fr 68px 68px',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: isMyTribe ? 'rgba(45,90,27,0.1)' : i % 2 === 0 ? '#e8c090' : '#ead9b0',
                      borderBottom: '1px solid #c8975a',
                    }}
                  >
                    {/* Rank */}
                    <span style={{ fontFamily: pf, fontSize: i < 3 ? 10 : 8, color: rc, textShadow: i < 3 ? `0 0 8px ${rc}99` : 'none' }}>
                      {i + 1}
                    </span>

                    {/* Tag */}
                    <div style={{ width: 40, height: 30, background: '#c8975a', border: `2px solid ${isMyTribe ? '#2d5a1b' : '#8b5a2b'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: pf, fontSize: 6, color: '#3a1f0a' }}>
                      {t.tag}
                    </div>

                    {/* Name */}
                    <div style={{ paddingLeft: 8, overflow: 'hidden' }}>
                      <div style={{ fontFamily: pf, fontSize: 7, color: '#3a1f0a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.name}
                        {isMyTribe && <span style={{ marginLeft: 8, fontSize: 5, color: '#2d5a1b' }}>YOURS</span>}
                      </div>
                      {t.description && (
                        <div style={{ fontFamily: sf, fontSize: 9, color: '#8b5a2b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.description}
                        </div>
                      )}
                    </div>

                    {/* Members */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: pf, fontSize: 8, color: '#3a1f0a' }}>{t.tribe_members.length}</div>
                      <div style={{ fontFamily: pf, fontSize: 5, color: '#8b5a2b' }}>/ 10</div>
                    </div>

                    {/* Power + action */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                      <div style={{ fontFamily: pf, fontSize: 8, color: pow > 0 ? '#2d5a1b' : '#8b5a2b' }}>
                        {pow > 0 ? pow.toLocaleString() : '—'}
                      </div>
                      {!isMyTribe && !isMember && wallet && (
                        <button
                          onClick={() => handleJoinTribe(t)}
                          disabled={joiningId === t.id || full}
                          style={{
                            fontFamily: pf, fontSize: 5, padding: '3px 8px',
                            background: full ? '#666' : '#2d5a1b',
                            border: `2px solid ${full ? '#444' : '#1a3a0d'}`,
                            color: full ? '#aaa' : '#ccffcc',
                            cursor: full ? 'not-allowed' : 'pointer',
                            boxShadow: full ? 'none' : 'inset 1px 1px 0 rgba(255,255,255,0.15)',
                          }}
                        >
                          {joiningId === t.id ? '…' : full ? 'FULL' : 'JOIN'}
                        </button>
                      )}
                      {isMyTribe && (
                        <div style={{ width: 8, height: 8, background: '#2d5a1b' }} />
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ══ MY TRIBE ══ */}
          {tab === 'mine' && (
            <div style={{ padding: 16 }}>
              {loading && <div style={{ textAlign: 'center', fontFamily: pf, fontSize: 8, color: '#8b5a2b', padding: 20 }}>Loading…</div>}

              {!wallet && !loading && (
                <div style={{ textAlign: 'center', fontFamily: pf, fontSize: 8, color: '#8b5a2b', padding: 20 }}>Connect wallet to use tribes</div>
              )}

              {!loading && wallet && myTribe && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Tribe card */}
                  <div style={{ background: '#d4a574', border: '3px solid #5c3317', padding: 12, boxShadow: 'inset 1px 1px 0 #e8c090' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 52, height: 52, background: '#c8975a', border: '3px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: pf, fontSize: 11, color: '#3a1f0a', flexShrink: 0 }}>
                        {myTribe.tag}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: pf, fontSize: 10, color: '#3a1f0a' }}>{myTribe.name}</div>
                        <div style={{ fontFamily: pf, fontSize: 6, color: '#8b5a2b', marginTop: 4 }}>
                          {myRole === 'leader' ? 'You are the Leader' : `Led by ${shortWallet(myTribe.leader_wallet)}`}
                        </div>
                        {myTribe.description && (
                          <div style={{ fontFamily: sf, fontSize: 9, color: '#5c3317', marginTop: 4, lineHeight: 1.4 }}>{myTribe.description}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <StatBox label="Members"    value={`${myTribe.tribe_members.length}/10`} />
                    <StatBox label="Yield Bonus" value={myRole === 'leader' ? `+${myTribe.tribe_members.length * 5}%` : '+10%'} green />
                    <StatBox label="Power"       value={power(myTribe).toLocaleString()} />
                  </div>

                  <div style={{ fontFamily: sf, fontSize: 9, color: '#5c3317', background: '#c8975a', border: '2px solid #8b5a2b', padding: '6px 10px', lineHeight: 1.6 }}>
                    {myRole === 'leader'
                      ? `+5% yield per member. Current: +${myTribe.tribe_members.length * 5}% on all harvests.`
                      : 'Members earn +10% yield on all crop harvests.'}
                  </div>

                  {/* Invite code */}
                  {myRole === 'leader' && (
                    <div>
                      <div style={{ fontFamily: pf, fontSize: 6, color: '#5c3317', marginBottom: 6 }}>INVITE CODE</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <div style={{ flex: 1, fontFamily: 'monospace', fontSize: 14, color: '#3a1f0a', background: '#c8975a', border: '2px solid #5c3317', padding: '5px 10px', letterSpacing: 4, userSelect: 'all' }}>
                          {myTribe.invite_code}
                        </div>
                        <button onClick={copyInvite} className="pixel-btn" style={{ fontSize: 7, padding: '6px 10px' }}>COPY</button>
                      </div>
                      <div style={{ fontFamily: sf, fontSize: 9, color: '#8b5a2b', marginTop: 4 }}>Share this code to invite followers</div>
                    </div>
                  )}

                  {/* Members */}
                  <div>
                    <div style={{ fontFamily: pf, fontSize: 6, color: '#5c3317', marginBottom: 8 }}>MEMBERS ({myTribe.tribe_members.length})</div>
                    {myTribe.tribe_members.length === 0
                      ? <div style={{ fontFamily: sf, fontSize: 9, color: '#8b5a2b' }}>No members yet. Share your invite code!</div>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {myTribe.tribe_members.map(m => (
                            <div key={m.wallet} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: '#c8975a', border: '2px solid #8b5a2b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, background: '#2d5a1b' }} />
                                <span style={{ fontFamily: pf, fontSize: 7, color: '#3a1f0a' }}>{shortWallet(m.wallet)}</span>
                              </div>
                              {myRole === 'leader' && m.wallet !== wallet && (
                                <button onClick={() => handleKick(m.wallet)} style={{ fontFamily: pf, fontSize: 5, background: '#8b2020', border: '2px solid #5c1010', color: '#ffaaaa', cursor: 'pointer', padding: '3px 8px' }}>
                                  KICK
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {myRole === 'member' && (
                      <button onClick={handleLeave} className="pixel-btn" style={{ flex: 1, fontSize: 7, background: '#5c3317', borderColor: '#3a1f0a', color: '#f0d080' }}>LEAVE TRIBE</button>
                    )}
                    {myRole === 'leader' && (
                      <button onClick={handleDisband} className="pixel-btn" style={{ flex: 1, fontSize: 7, background: '#8b2020', borderColor: '#5c1010', color: '#ffaaaa' }}>DISBAND</button>
                    )}
                  </div>
                </div>
              )}

              {!loading && wallet && !myTribe && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <Section title="CREATE A TRIBE">
                    <div style={{ fontFamily: sf, fontSize: 10, color: '#5c3317', lineHeight: 1.6, marginBottom: 12 }}>
                      Start a tribe as a leader. Earn <b>+5% yield per member</b>. Your followers earn <b>+10%</b>.
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <Field label="TRIBE NAME">
                        <input className="pixel-input" value={createName} onChange={e => setCreateName(e.target.value.slice(0, 32))} placeholder="e.g. Sol Farmers" style={{ width: '100%', fontSize: 9 }} />
                      </Field>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Field label="TAG (2-4 CHARS)">
                          <input className="pixel-input" value={createTag} onChange={e => setCreateTag(e.target.value.slice(0, 4).toUpperCase())} placeholder="SOL" style={{ width: 80, fontSize: 9 }} />
                        </Field>
                        <Field label="DESCRIPTION" style={{ flex: 1 }}>
                          <input className="pixel-input" value={createDesc} onChange={e => setCreateDesc(e.target.value.slice(0, 120))} placeholder="About your tribe..." style={{ width: '100%', fontSize: 9 }} />
                        </Field>
                      </div>
                      {createErr && <div style={{ fontFamily: pf, fontSize: 7, color: '#cc2020' }}>{createErr}</div>}
                      <button onClick={handleCreate} disabled={creating || !createName.trim() || !createTag.trim()} className="pixel-btn" style={{ fontSize: 8, padding: 10 }}>
                        {creating ? 'Creating…' : 'CREATE TRIBE'}
                      </button>
                    </div>
                  </Section>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, height: 2, background: '#8b5a2b' }} />
                    <span style={{ fontFamily: pf, fontSize: 6, color: '#8b5a2b' }}>OR JOIN</span>
                    <div style={{ flex: 1, height: 2, background: '#8b5a2b' }} />
                  </div>

                  <Section title="JOIN BY INVITE CODE">
                    <div style={{ fontFamily: sf, fontSize: 10, color: '#5c3317', lineHeight: 1.6, marginBottom: 10 }}>
                      Have a code from a KOL or friend?
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <Field label="INVITE CODE" style={{ flex: 1 }}>
                        <input className="pixel-input" value={joinCode} onChange={e => setJoinCode(e.target.value.trim())} placeholder="xxxxxxxx" style={{ width: '100%', fontSize: 9, letterSpacing: 2 }} />
                      </Field>
                      <button onClick={handleJoinByCode} disabled={joining || !joinCode.trim()} className="pixel-btn" style={{ fontSize: 7, padding: '9px 14px' }}>
                        {joining ? '…' : 'JOIN'}
                      </button>
                    </div>
                    {joinErr && <div style={{ fontFamily: pf, fontSize: 7, color: '#cc2020', marginTop: 6 }}>{joinErr}</div>}
                  </Section>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div style={{ background: '#c8975a', border: '2px solid #8b5a2b', padding: '6px 8px', textAlign: 'center' }}>
      <div style={{ fontFamily: pf, fontSize: 5, color: '#8b5a2b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: pf, fontSize: 9, color: green ? '#2d5a1b' : '#3a1f0a' }}>{value}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: pf, fontSize: 7, color: '#5c3317', marginBottom: 10, paddingBottom: 6, borderBottom: '2px solid #c8975a' }}>{title}</div>
      {children}
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <div style={{ fontFamily: pf, fontSize: 6, color: '#5c3317', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  )
}
