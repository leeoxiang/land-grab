-- ══════════════════════════════════════════════════════════════════
-- Migration 001: Tribes tables
-- Safe to re-run (uses IF NOT EXISTS / DO blocks).
-- Paste into Supabase SQL editor → Run.
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tribes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,
  tag            text NOT NULL,
  leader_wallet  text NOT NULL,
  plot_id        int  REFERENCES plots(id) ON DELETE SET NULL,
  description    text,
  invite_code    text NOT NULL UNIQUE,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tribe_members (
  tribe_id   uuid NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  wallet     text NOT NULL,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (tribe_id, wallet)
);

-- Used by apply/route.ts, applications/route.ts, applications/respond/route.ts
CREATE TABLE IF NOT EXISTS tribe_applications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tribe_id   uuid NOT NULL REFERENCES tribes(id) ON DELETE CASCADE,
  wallet     text NOT NULL,
  message    text,
  status     text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (tribe_id, wallet)   -- required for upsert onConflict: 'tribe_id,wallet'
);

CREATE INDEX IF NOT EXISTS tribe_applications_tribe_id_idx ON tribe_applications(tribe_id);
CREATE INDEX IF NOT EXISTS tribe_applications_wallet_idx   ON tribe_applications(wallet);
CREATE INDEX IF NOT EXISTS tribe_members_wallet_idx        ON tribe_members(wallet);

-- ── Enable RLS ────────────────────────────────────────────────────

ALTER TABLE tribes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_applications ENABLE ROW LEVEL SECURITY;

-- ── Public read policies ──────────────────────────────────────────

DO $$ BEGIN
  CREATE POLICY "tribes_public_read"              ON tribes             FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tribe_members_public_read"       ON tribe_members      FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tribe_applications_public_read"  ON tribe_applications FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Service-role bypass (supabaseAdmin() in API routes) ───────────

DO $$ BEGIN
  CREATE POLICY "tribes_service_all"              ON tribes             FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tribe_members_service_all"       ON tribe_members      FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tribe_applications_service_all"  ON tribe_applications FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════
-- Reload PostgREST schema cache so tables are immediately visible.
-- (Also available in Dashboard → API → Reload schema)
-- ══════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
