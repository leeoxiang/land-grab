'use client'

import { CHARACTER_DEFS, type CharacterDef } from '@/config/characters'

interface Props {
  currentCharId: string
  onSelect: (id: string) => void
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  farmer:      'FARMERS',
  townsperson: 'TOWNSPEOPLE',
  knight:      'KNIGHTS',
  goblin:      'GOBLINS',
  angel:       'ANGELS',
}

const CATEGORY_ORDER = ['farmer', 'townsperson', 'knight', 'goblin', 'angel']

export default function CharacterPicker({ currentCharId, onSelect, onClose }: Props) {
  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    label:  CATEGORY_LABELS[cat] ?? cat,
    chars:  CHARACTER_DEFS.filter(c => c.category === cat),
  }))

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          100,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      'rgba(20,10,5,0.75)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          fontFamily:   '"Press Start 2P", monospace',
          background:   '#d4a574',
          border:       '4px solid #3a1f0a',
          boxShadow:    'inset 3px 3px 0 #e8c090, inset -3px -3px 0 #8b5a2b, 6px 6px 0 #3a1f0a',
          width:        640,
          maxWidth:     '95vw',
          maxHeight:    '90vh',
          display:      'flex',
          flexDirection:'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background:     '#c8975a',
          borderBottom:   '4px solid #3a1f0a',
          padding:        '10px 16px',
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          boxShadow:      'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #8b5a2b',
          flexShrink:     0,
        }}>
          <span style={{ fontSize: 11, color: '#3a1f0a' }}>CHOOSE CHARACTER</span>
          <button
            onClick={onClose}
            style={{
              background:  '#3a1f0a',
              color:       '#d4a574',
              border:      'none',
              cursor:      'pointer',
              padding:     '4px 10px',
              fontFamily:  '"Press Start 2P", monospace',
              fontSize:    10,
            }}
          >✕</button>
        </div>

        {/* Scroll area */}
        <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
          {grouped.map(({ cat, label, chars }) => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize:    8,
                color:       '#5c3317',
                marginBottom: 10,
                letterSpacing: 1,
                borderBottom: '2px solid #8b5a2b',
                paddingBottom: 4,
              }}>
                {label}
              </div>

              <div style={{
                display:             'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap:                 10,
              }}>
                {chars.map(def => (
                  <CharCard
                    key={def.id}
                    def={def}
                    selected={def.id === currentCharId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop:   '3px solid #3a1f0a',
          padding:     '8px 16px',
          fontSize:    7,
          color:       '#8b5a2b',
          flexShrink:  0,
          textAlign:   'center',
        }}>
          Character is saved automatically · your character appears in the world
        </div>
      </div>
    </div>
  )
}

// ── Single character card ────────────────────────────────────────────────────

function CharCard({ def, selected, onSelect }: {
  def:      CharacterDef
  selected: boolean
  onSelect: (id: string) => void
}) {
  // Show the first frame of the south (down) animation row
  // Portrait = row 3, col 0 → CSS background-position
  const PORTRAIT_ROW   = 3
  const sheetWidthPx   = def.frameWidth  * def.sheetCols
  const portraitY      = def.frameHeight * PORTRAIT_ROW
  const PREVIEW_SCALE  = Math.max(1, Math.floor(80 / def.frameHeight))  // fit ~80px tall

  return (
    <button
      onClick={() => onSelect(def.id)}
      style={{
        all:          'unset',
        cursor:       'pointer',
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          6,
        padding:      8,
        background:   selected ? '#ffd700' : '#c8975a',
        border:       selected ? '3px solid #3a1f0a' : '3px solid #8b5a2b',
        boxShadow:    selected
          ? 'inset 2px 2px 0 #ffec80, inset -2px -2px 0 #a07000, 3px 3px 0 #3a1f0a'
          : 'inset 2px 2px 0 #e8c090, inset -2px -2px 0 #6b4428',
        borderRadius: 0,
      }}
    >
      {/* Sprite portrait via CSS crop */}
      <div style={{
        width:        def.frameWidth  * PREVIEW_SCALE,
        height:       def.frameHeight * PREVIEW_SCALE,
        overflow:     'hidden',
        imageRendering: 'pixelated',
        flexShrink:   0,
      }}>
        <div style={{
          width:           def.frameWidth,
          height:          def.frameHeight,
          backgroundImage: `url('${def.file}')`,
          backgroundRepeat:'no-repeat',
          backgroundPosition: `0px -${portraitY}px`,
          backgroundSize:  `${sheetWidthPx}px auto`,
          imageRendering:  'pixelated',
          transform:       `scale(${PREVIEW_SCALE})`,
          transformOrigin: 'top left',
        }} />
      </div>

      {/* Name */}
      <span style={{
        fontSize:   7,
        color:      selected ? '#3a1f0a' : '#3a1f0a',
        textAlign:  'center',
        lineHeight: 1.4,
        maxWidth:   90,
        overflow:   'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {def.label.toUpperCase()}
      </span>

      {selected && (
        <span style={{ fontSize: 6, color: '#3a1f0a', marginTop: -2 }}>
          ✓ EQUIPPED
        </span>
      )}
    </button>
  )
}
