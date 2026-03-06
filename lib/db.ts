import { Pool } from 'pg'

// Shared pg pool — same connection as /api/players and /api/chat
// Bypasses PostgREST / supabase service-role-key requirement entirely
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
