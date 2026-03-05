import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, '../supabase-schema.sql'), 'utf8')

const client = new pg.Client({
  connectionString: 'postgresql://postgres:Planket76!!!@db.stlimdpixjobyzjlkpai.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  console.log('Connected to Supabase...')
  await client.query(sql)
  console.log('Schema applied successfully!')

  const { rows } = await client.query('SELECT COUNT(*) FROM plots')
  console.log(`Plots in database: ${rows[0].count}`)
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await client.end()
}
