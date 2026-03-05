import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://stlimdpixjobyzjlkpai.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0bGltZHBpeGpvYnl6amxrcGFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ5NDIxMSwiZXhwIjoyMDg4MDcwMjExfQ.E3rSDdSHZ3_1hSXCPmKdue052M1yt0pxAe4wqr0DfIk'
)

const { data: plots, error } = await supabase.from('plots').select('*').order('id')

if (error) {
  console.error('Error:', error.message)
  process.exit(1)
}

const tiers = { bronze: 0, silver: 0, gold: 0, diamond: 0 }
plots.forEach(p => tiers[p.tier]++)

console.log(`✅ Database connected!`)
console.log(`📦 Total plots: ${plots.length}`)
console.log(`🟤 Bronze: ${tiers.bronze}`)
console.log(`⚪ Silver: ${tiers.silver}`)
console.log(`🟡 Gold:   ${tiers.gold}`)
console.log(`💎 Diamond: ${tiers.diamond}`)
console.log(`\nFirst 3 plots:`, plots.slice(0, 3).map(p => `#${p.id} ${p.tier} (${p.col},${p.row})`))
