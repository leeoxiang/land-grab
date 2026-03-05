'use client'

import { useState } from 'react'
import PixelIcon from '@/components/ui/PixelIcon'

// ── Inline pixel-art SVG icons (no emojis) ──────────────────────────────────
function IconMap() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="1" y="1" width="14" height="14" fill="#1a2a0a" rx="0"/>
      <rect x="2" y="2" width="12" height="12" fill="#2a4a1a"/>
      {/* grid lines */}
      <rect x="5" y="2" width="1" height="12" fill="#1a3a0a" opacity="0.6"/>
      <rect x="9" y="2" width="1" height="12" fill="#1a3a0a" opacity="0.6"/>
      <rect x="2" y="5" width="12" height="1" fill="#1a3a0a" opacity="0.6"/>
      <rect x="2" y="9" width="12" height="1" fill="#1a3a0a" opacity="0.6"/>
      {/* plots */}
      <rect x="2" y="2" width="3" height="3" fill="#cd7f32" opacity="0.9"/>
      <rect x="10" y="2" width="4" height="3" fill="#ffd700" opacity="0.9"/>
      <rect x="6" y="6" width="3" height="3" fill="#c0c0c0" opacity="0.9"/>
      <rect x="10" y="10" width="4" height="4" fill="#00bfff" opacity="0.9"/>
      {/* player dot */}
      <rect x="3" y="7" width="2" height="2" fill="#ffffff"/>
    </svg>
  )
}

function IconFlag() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="10" width="10" height="5" fill="#cd7f32"/>
      <rect x="2" y="10" width="10" height="1" fill="#a05a20"/>
      <rect x="2" y="14" width="10" height="1" fill="#a05a20"/>
      <rect x="2" y="10" width="1" height="5" fill="#a05a20"/>
      <rect x="11" y="10" width="1" height="5" fill="#a05a20"/>
      {/* flag pole */}
      <rect x="7" y="1" width="1" height="10" fill="#8b5a2b"/>
      {/* flag */}
      <rect x="8" y="1" width="5" height="4" fill="#7fffb0"/>
      <rect x="8" y="1" width="5" height="1" fill="#56db45"/>
      <rect x="12" y="2" width="1" height="2" fill="#56db45"/>
    </svg>
  )
}

function IconSprout() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      {/* soil */}
      <rect x="1" y="12" width="14" height="3" fill="#5c3317"/>
      <rect x="1" y="11" width="14" height="1" fill="#7a4520"/>
      {/* stem */}
      <rect x="7" y="4" width="2" height="8" fill="#2ecc71"/>
      {/* left leaf */}
      <rect x="3" y="6" width="4" height="2" fill="#27ae60"/>
      <rect x="3" y="5" width="2" height="1" fill="#27ae60"/>
      {/* right leaf */}
      <rect x="9" y="8" width="4" height="2" fill="#2ecc71"/>
      <rect x="11" y="7" width="2" height="1" fill="#2ecc71"/>
      {/* top sprout */}
      <rect x="6" y="3" width="4" height="2" fill="#7fffb0"/>
      <rect x="7" y="2" width="2" height="1" fill="#7fffb0"/>
    </svg>
  )
}

function IconCow() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      {/* body */}
      <rect x="3" y="6" width="10" height="6" fill="#e8d5b0"/>
      {/* spots */}
      <rect x="5" y="7" width="2" height="2" fill="#4a3020"/>
      <rect x="9" y="8" width="2" height="2" fill="#4a3020"/>
      {/* head */}
      <rect x="10" y="4" width="4" height="4" fill="#e8d5b0"/>
      {/* nose */}
      <rect x="12" y="6" width="2" height="1" fill="#d4a0a0"/>
      {/* eye */}
      <rect x="11" y="5" width="1" height="1" fill="#2a1a0a"/>
      {/* ear */}
      <rect x="10" y="3" width="1" height="1" fill="#e8d5b0"/>
      <rect x="13" y="3" width="1" height="1" fill="#e8d5b0"/>
      {/* horn */}
      <rect x="11" y="2" width="1" height="2" fill="#c8a060"/>
      {/* legs */}
      <rect x="4" y="12" width="2" height="3" fill="#c8a060"/>
      <rect x="7" y="12" width="2" height="3" fill="#c8a060"/>
      <rect x="10" y="12" width="2" height="3" fill="#c8a060"/>
      {/* tail */}
      <rect x="2" y="7" width="1" height="3" fill="#c8a060"/>
      <rect x="1" y="9" width="1" height="2" fill="#c8a060"/>
      {/* udder */}
      <rect x="5" y="11" width="4" height="1" fill="#f5c0c0"/>
    </svg>
  )
}

function IconUpgrade() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      {/* base platform */}
      <rect x="2" y="12" width="12" height="2" fill="#5c3317"/>
      <rect x="2" y="14" width="12" height="1" fill="#3a1f0a"/>
      {/* level bars */}
      <rect x="2" y="9" width="3" height="3" fill="#cd7f32"/>
      <rect x="6" y="7" width="3" height="5" fill="#c0c0c0"/>
      <rect x="10" y="4" width="4" height="8" fill="#ffd700"/>
      {/* sparkle on top */}
      <rect x="11" y="2" width="1" height="1" fill="#ffffff"/>
      <rect x="10" y="3" width="1" height="1" fill="#ffffff"/>
      <rect x="12" y="3" width="1" height="1" fill="#ffffff"/>
      <rect x="11" y="4" width="1" height="1" fill="#ffffff" opacity="0.5"/>
      {/* arrow up */}
      <rect x="7" y="1" width="2" height="4" fill="#7fffb0"/>
      <rect x="5" y="3" width="6" height="1" fill="#7fffb0"/>
      <rect x="6" y="2" width="4" height="1" fill="#7fffb0"/>
    </svg>
  )
}

function IconTrophy() {
  return (
    <svg width="32" height="32" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      {/* base */}
      <rect x="5" y="13" width="6" height="2" fill="#a07840"/>
      <rect x="4" y="14" width="8" height="1" fill="#a07840"/>
      {/* stem */}
      <rect x="7" y="11" width="2" height="2" fill="#c8a060"/>
      {/* cup handles */}
      <rect x="2" y="4" width="2" height="4" fill="#c8a060"/>
      <rect x="2" y="4" width="3" height="1" fill="#c8a060"/>
      <rect x="2" y="7" width="3" height="1" fill="#c8a060"/>
      <rect x="12" y="4" width="2" height="4" fill="#c8a060"/>
      <rect x="11" y="4" width="3" height="1" fill="#c8a060"/>
      <rect x="11" y="7" width="3" height="1" fill="#c8a060"/>
      {/* cup body */}
      <rect x="4" y="2" width="8" height="9" fill="#ffd700"/>
      <rect x="4" y="2" width="8" height="1" fill="#ffe566"/>
      <rect x="4" y="2" width="1" height="9" fill="#ffe566"/>
      {/* star inside */}
      <rect x="7" y="5" width="2" height="2" fill="#ffffff" opacity="0.5"/>
      <rect x="6" y="6" width="4" height="1" fill="#ffffff" opacity="0.5"/>
    </svg>
  )
}

const STEPS = [
  {
    Icon:    IconMap,
    title:   'Explore the World',
    body:    'Walk with WASD or the D-pad on mobile. 100 plots across a 10×10 world — Bronze, Silver, Gold, and Diamond tiers.',
    accent:  '#cd7f32',
    tag:     '01',
  },
  {
    Icon:    IconFlag,
    title:   'Claim Your Plot',
    body:    'Connect a Solana wallet and claim any free plot to start farming. New wallets receive a free Bronze plot automatically.',
    accent:  '#c0c0c0',
    tag:     '02',
  },
  {
    Icon:    IconSprout,
    title:   'Plant & Harvest',
    body:    'Open your plot and go to the Crops tab. Plant seeds, wait for them to grow, then harvest and sell for USDC.',
    accent:  '#56db45',
    tag:     '03',
  },
  {
    Icon:    IconCow,
    title:   'Raise Animals',
    body:    'Buy animals that produce eggs, milk, wool and more on a timer. Passive income that compounds while you sleep.',
    accent:  '#ffaa44',
    tag:     '04',
  },
  {
    Icon:    IconUpgrade,
    title:   'Upgrade Your Plot',
    body:    'Spend USDC to upgrade up to Level 4 for a 2x yield multiplier on all crops and animals.',
    accent:  '#ffd700',
    tag:     '05',
  },
  {
    Icon:    IconTrophy,
    title:   'Top the Leaderboard',
    body:    'Score points by owning plots. Diamond=100pts, Gold=50, Silver=20, Bronze=10. Climb to the top.',
    accent:  '#00bfff',
    tag:     '06',
  },
]

const KEYS = [
  { keys: ['W', 'A', 'S', 'D'], label: 'Move character' },
  { keys: ['Click'], label: 'Open plot' },
  { keys: ['▲', '▼', '◀', '▶'], label: 'Jump between plots' },
  { keys: ['?'], label: 'Reopen this guide' },
]

function KeyChip({ k }: { k: string }) {
  return (
    <span style={{
      display:        'inline-flex',
      alignItems:     'center',
      justifyContent: 'center',
      minWidth:       22,
      height:         22,
      padding:        '0 5px',
      background:     '#1a0a00',
      border:         '2px solid #5c3317',
      boxShadow:      'inset 0 -2px 0 #3a1f0a, 0 2px 0 #0a0500',
      fontFamily:     '"Press Start 2P", monospace',
      fontSize:       8,
      color:          '#f0d080',
      letterSpacing:  0,
    }}>
      {k}
    </span>
  )
}

export default function HowToPlay({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState(0)
  const step = STEPS[active]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-[100]"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={onClose}
    >
      <div
        style={{
          width:        660,
          maxWidth:     '96vw',
          maxHeight:    '92vh',
          display:      'flex',
          flexDirection:'column',
          background:   '#0d0800',
          border:       '4px solid #3a1f0a',
          boxShadow:    `0 0 0 1px #1a0a00, 0 0 60px rgba(${hexToRgb(step.accent)},0.25), 8px 8px 0 #000`,
          overflow:     'hidden',
          transition:   'box-shadow 0.4s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div style={{
          background:   '#120800',
          borderBottom: '3px solid #2a1400',
          padding:      '18px 24px 14px',
          display:      'flex',
          alignItems:   'center',
          justifyContent: 'space-between',
          flexShrink:   0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <PixelIcon icon="crops" size={24} />
            <div>
              <div style={{
                fontFamily:   '"Press Start 2P", monospace',
                fontSize:     13,
                color:        '#ffd700',
                letterSpacing: 1,
                lineHeight:   1,
              }}>
                LAND GRAB
              </div>
              <div style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize:   7,
                color:      '#5c3317',
                marginTop:  5,
                letterSpacing: 1,
              }}>
                HOW TO PLAY
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background:  'none',
              border:      '2px solid #3a1f0a',
              color:       '#5c3317',
              fontFamily:  '"Press Start 2P", monospace',
              fontSize:    12,
              width:       32,
              height:      32,
              cursor:      'pointer',
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'center',
              flexShrink:  0,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Step tabs ──────────────────────────────────────── */}
        <div style={{
          display:      'flex',
          borderBottom: '2px solid #1a0a00',
          background:   '#0a0500',
          flexShrink:   0,
          overflowX:    'auto',
          scrollbarWidth: 'none',
        }}>
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                flex:        '1 0 auto',
                padding:     '8px 4px',
                background:  i === active ? '#120800' : 'transparent',
                border:      'none',
                borderBottom: i === active ? `3px solid ${s.accent}` : '3px solid transparent',
                cursor:      'pointer',
                display:     'flex',
                flexDirection: 'column',
                alignItems:  'center',
                gap:         4,
                transition:  'background 0.2s',
              }}
            >
              <div style={{
                width:         28,
                height:        28,
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                opacity:       i === active ? 1 : 0.4,
                transition:    'opacity 0.2s',
              }}>
                <s.Icon />
              </div>
              <div style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize:   6,
                color:      i === active ? s.accent : '#3a1f0a',
                transition: 'color 0.2s',
              }}>
                {s.tag}
              </div>
            </button>
          ))}
        </div>

        {/* ── Step content ───────────────────────────────────── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Main card */}
          <div style={{
            flex:        1,
            display:     'flex',
            padding:     '28px 32px',
            gap:         28,
            alignItems:  'flex-start',
            background:  '#0d0800',
          }}>
            {/* Left — big icon + step number */}
            <div style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           12,
              flexShrink:    0,
            }}>
              <div style={{
                width:          80,
                height:         80,
                background:     '#120800',
                border:         `3px solid ${step.accent}`,
                boxShadow:      `0 0 20px ${step.accent}44, inset 0 0 20px rgba(0,0,0,0.5)`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                position:       'relative',
              }}>
                <div style={{ transform: 'scale(2.4)', imageRendering: 'pixelated' }}>
                  <step.Icon />
                </div>
              </div>
              <div style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize:   20,
                color:      step.accent,
                opacity:    0.25,
                lineHeight: 1,
                letterSpacing: 2,
              }}>
                {step.tag}
              </div>
            </div>

            {/* Right — text */}
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily:   '"Press Start 2P", monospace',
                fontSize:     11,
                color:        step.accent,
                marginBottom: 14,
                lineHeight:   1.6,
                letterSpacing: 0.5,
              }}>
                {step.title}
              </div>
              <div style={{
                fontSize:   13,
                color:      '#c8a060',
                lineHeight: 1.8,
                fontFamily: 'system-ui, sans-serif',
              }}>
                {step.body}
              </div>

              {/* Accent divider */}
              <div style={{
                marginTop:  20,
                height:     2,
                background: `linear-gradient(to right, ${step.accent}66, transparent)`,
              }} />
            </div>
          </div>

          {/* Controls bar (shown on last step or always visible at bottom) */}
          <div style={{
            borderTop:  '2px solid #1a0a00',
            background: '#0a0500',
            padding:    '12px 24px',
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily:   '"Press Start 2P", monospace',
              fontSize:     7,
              color:        '#3a1f0a',
              marginBottom: 8,
              letterSpacing: 1,
            }}>
              CONTROLS
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {KEYS.map((k, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {k.keys.map(key => <KeyChip key={key} k={key} />)}
                  </div>
                  <span style={{ fontSize: 10, color: '#5c3317', fontFamily: 'system-ui, sans-serif' }}>
                    {k.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer — prev/next + start ─────────────────────── */}
        <div style={{
          display:      'flex',
          gap:          10,
          padding:      '12px 20px',
          borderTop:    '3px solid #1a0a00',
          background:   '#080400',
          flexShrink:   0,
          alignItems:   'center',
        }}>
          <button
            onClick={() => setActive(a => Math.max(0, a - 1))}
            disabled={active === 0}
            style={{
              fontFamily:  '"Press Start 2P", monospace',
              fontSize:    10,
              background:  '#1a0a00',
              border:      '3px solid #3a1f0a',
              color:       active === 0 ? '#2a1400' : '#a07840',
              padding:     '10px 16px',
              cursor:      active === 0 ? 'not-allowed' : 'pointer',
              boxShadow:   active === 0 ? 'none' : 'inset 1px 1px 0 #2a1400, 3px 3px 0 #000',
            }}
          >
            ◀ PREV
          </button>

          {/* Progress dots */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 8 }}>
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  width:      i === active ? 20 : 8,
                  height:     8,
                  background: i === active ? s.accent : '#2a1400',
                  border:     'none',
                  cursor:     'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow:  i === active ? `0 0 6px ${s.accent}88` : 'none',
                }}
              />
            ))}
          </div>

          {active < STEPS.length - 1 ? (
            <button
              onClick={() => setActive(a => a + 1)}
              style={{
                fontFamily:  '"Press Start 2P", monospace',
                fontSize:    10,
                background:  '#1a0a00',
                border:      '3px solid #3a1f0a',
                color:       '#a07840',
                padding:     '10px 16px',
                cursor:      'pointer',
                boxShadow:   'inset 1px 1px 0 #2a1400, 3px 3px 0 #000',
              }}
            >
              NEXT ▶
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                fontFamily:  '"Press Start 2P", monospace',
                fontSize:    10,
                background:  '#2d5a1b',
                border:      '3px solid #1a3a0d',
                color:       '#7fffb0',
                padding:     '10px 20px',
                cursor:      'pointer',
                boxShadow:   'inset 1px 1px 0 #3d8a2b, inset -1px -1px 0 #1a2a10, 3px 3px 0 #0a1a05, 0 0 12px rgba(127,255,176,0.2)',
              }}
            >
              START PLAYING ▶
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}
