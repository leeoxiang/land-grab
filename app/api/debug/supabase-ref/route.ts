/**
 * TEMPORARY DEBUG ROUTE — remove after diagnosing tribe table errors.
 *
 * Safe to deploy: exposes NO secrets. It only decodes the JWT *payload*
 * (base64url-encoded, not encrypted) and masks the actual key value.
 *
 * To remove: delete app/api/debug/supabase-ref/route.ts
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.')
    if (parts.length < 2) return null
    const b64  = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(b64, 'base64').toString('utf8')
    return JSON.parse(json)
  } catch {
    return null
  }
}

function refFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.split('.')[0] ?? null
  } catch {
    return null
  }
}

function refFromPayload(p: Record<string, unknown>): string | null {
  if (typeof p.ref === 'string') return p.ref
  if (typeof p.iss === 'string' && p.iss.includes('.supabase.co'))
    return p.iss.replace('https://', '').split('.')[0]
  return null
}

async function probeTable(tableName: string): Promise<{ exists: boolean; error: string | null }> {
  try {
    const db = supabaseAdmin()
    const { error } = await db.from(tableName as 'plots').select('*', { count: 'exact', head: true })
    if (error) return { exists: false, error: error.message }
    return { exists: true, error: null }
  } catch (e: unknown) {
    return { exists: false, error: String(e) }
  }
}

export async function GET() {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL      ?? ''
  const serviceKey     = process.env.SUPABASE_SERVICE_ROLE_KEY     ?? ''
  const anonKey        = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const urlRef         = refFromUrl(supabaseUrl)
  const servicePayload = decodeJwtPayload(serviceKey)
  const serviceRef     = servicePayload ? refFromPayload(servicePayload) : null
  const anonPayload    = decodeJwtPayload(anonKey)
  const anonRef        = anonPayload    ? refFromPayload(anonPayload)    : null
  const refsMatch      = !!(urlRef && serviceRef && urlRef === serviceRef)

  // Probe all critical tables in parallel
  const [plots, tribes, tribeMembers, tribeApps, players] = await Promise.all([
    probeTable('plots'),
    probeTable('tribes'),
    probeTable('tribe_members'),
    probeTable('tribe_applications'),
    probeTable('players'),
  ])

  // Stale-deployment signal: this timestamp is baked in at build time.
  // If the deployment is stale, this value won't match the latest push time.
  const buildTime = process.env.VERCEL_GIT_COMMIT_SHA
    ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ?? '(no VERCEL_GIT_COMMIT_SHA — not a Vercel deployment or env missing)'

  // Diagnose the PostgREST schema-cache error specifically.
  // If refs match AND tables exist in Postgres but this still errors,
  // the PostgREST schema cache needs a reload.
  const allTablesOk = tribes.exists && tribeMembers.exists && tribeApps.exists
  const schemaVerdict = allTablesOk
    ? '✅ All tribe tables reachable via PostgREST'
    : tribes.error?.includes('schema cache')
      ? '❌ PostgREST schema cache stale — run: NOTIFY pgrst, \'reload schema\'; in Supabase SQL editor'
      : '❌ Tribe tables not reachable — check migration was run'

  return NextResponse.json({
    // ── Build / deployment identity ──────────────────────────────
    deployment: {
      servedAt:     new Date().toISOString(),
      gitCommitSha: buildTime,
      note: 'If gitCommitSha does not match your latest GitHub commit, the deployment is stale — trigger a redeploy in Vercel.',
    },

    // ── Env checks ────────────────────────────────────────────────
    env: {
      supabaseUrl:          supabaseUrl || '(not set)',
      serviceKeySet:        !!serviceKey,
      serviceKeyPrefix:     serviceKey ? serviceKey.slice(0, 20) + '…' : '(not set)',
      anonKeySet:           !!anonKey,
    },

    // ── Ref comparison ────────────────────────────────────────────
    refs: {
      fromUrl:        urlRef,
      fromServiceKey: serviceRef,
      fromAnonKey:    anonRef,
      match:          refsMatch,
      verdict: refsMatch
        ? '✅ URL and service key point to the SAME project'
        : serviceRef
          ? `❌ MISMATCH — URL="${urlRef}"  serviceKey="${serviceRef}"`
          : `⚠️  Cannot extract ref from service key payload`,
    },

    // ── JWT payloads (safe — no secrets) ──────────────────────────
    jwtPayloads: {
      serviceRole: servicePayload,
      anon:        anonPayload,
    },

    // ── Live table probes (bypasses nothing — real PostgREST call) ─
    tables: {
      plots,
      tribes,
      tribe_members:       tribeMembers,
      tribe_applications:  tribeApps,
      players,
    },

    // ── Schema-cache diagnosis ─────────────────────────────────────
    schemaCache: {
      verdict: schemaVerdict,
      fix: 'Run in Supabase SQL editor → NOTIFY pgrst, \'reload schema\';',
      orVia: 'Supabase Dashboard → API → Reload schema cache button',
    },

    _removeAfterDebugging: 'DELETE app/api/debug/supabase-ref/route.ts',
  })
}
