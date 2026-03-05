/**
 * apply-metadata.mjs
 *
 * Reads public/plots/plots-metadata.json and updates every plot row with
 * the curated tier from the generator. Only touches the `tier` column
 * (which already exists — no schema changes needed).
 *
 * Run: node scripts/apply-metadata.mjs
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const metaPath  = join(__dirname, '../public/plots/plots-metadata.json')
const meta      = JSON.parse(readFileSync(metaPath, 'utf8'))

const supabase = createClient(
  'https://stlimdpixjobyzjlkpai.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bGltZHBpeGpvYnl6amxrcGFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ5NDIxMSwiZXhwIjoyMDg4MDcwMjExfQ.E3rSDdSHZ3_1hSXCPmKdue052M1yt0pxAe4wqr0DfIk',
)

console.log(`Applying curated tiers for ${meta.length} plots…`)

const tierCounts = { bronze: 0, silver: 0, gold: 0, diamond: 0 }
let updated = 0
let failed  = 0

for (const m of meta) {
  const { plotNumber, tier } = m

  const { error } = await supabase
    .from('plots')
    .update({ tier })
    .eq('id', plotNumber)

  if (error) {
    console.error(`  ✗ plot #${plotNumber}: ${error.message}`)
    failed++
  } else {
    tierCounts[tier]++
    updated++
    if (updated % 10 === 0) process.stdout.write(`  ${updated}/100…\n`)
  }
}

console.log(`\n✅ Updated: ${updated}  ✗ Failed: ${failed}`)
console.log(`   🟤 Bronze:  ${tierCounts.bronze}`)
console.log(`   ⚪ Silver:  ${tierCounts.silver}`)
console.log(`   🟡 Gold:    ${tierCounts.gold}`)
console.log(`   💎 Diamond: ${tierCounts.diamond}`)

// Verify
const { data: rows } = await supabase.from('plots').select('tier').order('id')
const dist = { bronze: 0, silver: 0, gold: 0, diamond: 0 }
rows?.forEach(r => { if (r.tier in dist) dist[r.tier]++ })
console.log('\nDB tier distribution:', dist)
