// Deterministic weather system — each plot has weather that changes every 6 hours.
// Weather is derived from a hash of (plotId × block), so each plot has its own
// micro-climate that feels independent of other plots.

export const WEATHER_TYPES = {
  sunny:   { label: 'Sunny',    cropBonus: 1.2, color: '#ffd700', bg: '#fffbe6' },
  cloudy:  { label: 'Cloudy',   cropBonus: 1.0, color: '#a0aec0', bg: '#f0f4f8' },
  rainy:   { label: 'Rainy',    cropBonus: 1.5, color: '#4a90d9', bg: '#ebf4ff' },
  stormy:  { label: 'Stormy',   cropBonus: 0.6, color: '#7b68ee', bg: '#1a1a2e' },
  foggy:   { label: 'Foggy',    cropBonus: 0.9, color: '#b0c4de', bg: '#e8edf2' },
  windy:   { label: 'Windy',    cropBonus: 1.1, color: '#48cae4', bg: '#e0f7fa' },
  heatwave:{ label: 'Heatwave', cropBonus: 0.7, color: '#ff6b35', bg: '#fff0e6' },
  rainbow: { label: 'Rainbow',  cropBonus: 2.0, color: '#ff69b4', bg: '#fff0f8' },
} as const

export type WeatherType = keyof typeof WEATHER_TYPES

const WEATHER_KEYS = Object.keys(WEATHER_TYPES) as WeatherType[]

// 6-hour weather blocks (4 per day)
const BLOCK_MS = 6 * 60 * 60 * 1000

// Knuth multiplicative hash — fast, good distribution
function hash32(n: number): number {
  return (Math.imul(n, 2654435761) >>> 0)
}

/** Deterministic weather for a plot at the current time */
export function getPlotWeather(plotId: number): WeatherType {
  const block = Math.floor(Date.now() / BLOCK_MS)
  // >>> 0 forces unsigned 32-bit so the modulo is always non-negative
  const seed  = (hash32(plotId) ^ hash32(block)) >>> 0
  // Rainbow is rare (~12.5% of the time without weighting, weight it down)
  const idx   = seed % (WEATHER_KEYS.length * 3)  // stretch array to reduce rainbow freq
  return WEATHER_KEYS[idx % WEATHER_KEYS.length]
}

/** ms until the next weather change */
export function msUntilWeatherChange(): number {
  const now   = Date.now()
  const block = Math.floor(now / BLOCK_MS)
  return (block + 1) * BLOCK_MS - now
}

/** Format ms as "Xh Ym" or "Ym" */
export function formatCountdown(ms: number): string {
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
