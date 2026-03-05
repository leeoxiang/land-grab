'use client'

// Crops: food.png  row 0 col 2  (orange/fruit icon)
// Animal: food.png row 0 col 0  (drumstick icon)
// Farmer: tools.png row 0 col 2 (rake/hoe icon)
// Home:   other.png row 0 col 0 (jar/pot icon)
// Coin:   resources.png row 0 col 3 (gold ore icon)

type IconName = 'crops' | 'animal' | 'farmer' | 'home' | 'coin'

interface IconDef {
  sheet: string
  col:   number
  row:   number
  tileW: number
  tileH: number
}

const ICONS: Record<IconName, IconDef> = {
  crops:  { sheet: '/assets/icons/food.png',      col: 2, row: 0, tileW: 16, tileH: 16 },
  animal: { sheet: '/assets/icons/food.png',      col: 0, row: 0, tileW: 16, tileH: 16 },
  farmer: { sheet: '/assets/icons/tools.png',     col: 2, row: 0, tileW: 16, tileH: 16 },
  home:   { sheet: '/assets/icons/other.png',     col: 0, row: 0, tileW: 16, tileH: 16 },
  coin:   { sheet: '/assets/icons/resources.png', col: 3, row: 0, tileW: 16, tileH: 16 },
}

interface Props {
  icon:    IconName
  size?:   number   // display size in px (default 16)
  style?:  React.CSSProperties
}

export default function PixelIcon({ icon, size = 16, style }: Props) {
  const def   = ICONS[icon]
  const scale = size / def.tileW

  return (
    <span
      style={{
        display:        'inline-block',
        width:          size,
        height:         size,
        flexShrink:     0,
        overflow:       'hidden',
        imageRendering: 'pixelated',
        ...style,
      }}
    >
      <span
        style={{
          display:             'block',
          width:               def.tileW,
          height:              def.tileH,
          backgroundImage:     `url('${def.sheet}')`,
          backgroundRepeat:    'no-repeat',
          backgroundPosition:  `-${def.col * def.tileW}px -${def.row * def.tileH}px`,
          backgroundSize:      'auto',
          imageRendering:      'pixelated',
          transform:           `scale(${scale})`,
          transformOrigin:     'top left',
        }}
      />
    </span>
  )
}
