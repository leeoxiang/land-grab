'use client'

import { useEffect } from 'react'

interface Props {
  icon:    string
  label:   string
  desc:    string
  onDone:  () => void
}

export default function AchievementToast({ icon, label, desc, onDone }: Props) {
  useEffect(() => {
    const id = setTimeout(onDone, 5000)
    return () => clearTimeout(id)
  }, [onDone])

  return (
    <div
      style={{
        position:   'fixed',
        top:        80,
        left:       '50%',
        transform:  'translateX(-50%)',
        zIndex:     200,
        background: '#1a1000',
        border:     '3px solid #ffd700',
        boxShadow:  '0 0 24px rgba(255,215,0,0.4), 4px 4px 0 #0a0500',
        padding:    '12px 20px',
        display:    'flex',
        alignItems: 'center',
        gap:        12,
        minWidth:   260,
        maxWidth:   360,
        animation:  'slideDown 0.3s ease',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{
          fontFamily: '"Press Start 2P", monospace',
          fontSize:   8,
          color:      '#ffd700',
          marginBottom: 4,
        }}>
          Achievement Unlocked!
        </div>
        <div style={{ fontSize: 11, color: '#fff', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 9, color: '#a07840', marginTop: 2 }}>{desc}</div>
      </div>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
