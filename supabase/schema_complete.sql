-- ══════════════════════════════════════════════════════════════════
-- Land Grab — Complete Schema  (SAFE to re-run, uses IF NOT EXISTS)
-- Paste this entire block into your Supabase SQL editor and run it.
-- ══════════════════════════════════════════════════════════════════

-- ── Core tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS players (
  wallet      text PRIMARY KEY,
  balance     numeric DEFAULT 0,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plots (
  id            int  PRIMARY KEY,
  tier          text NOT NULL CHECK (tier IN ('bronze','silver','gold','diamond')),
  col           int  NOT NULL,
  row           int  NOT NULL,
  owner_wallet  text REFERENCES players(wallet) ON DELETE SET NULL,
  locked_tokens numeric DEFAULT 0,
  claimed_at    timestamptz,
  last_fish_at  timestamptz
);

CREATE TABLE IF NOT EXISTS crops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id     int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  slot        int  NOT NULL,
  crop_type   text NOT NULL,
  planted_at  timestamptz NOT NULL,
  harvest_at  timestamptz NOT NULL,
  harvested   boolean DEFAULT false
);
CREATE INDEX IF NOT EXISTS crops_plot_id_idx ON crops(plot_id);

CREATE TABLE IF NOT EXISTS trees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id       int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  tree_type     text NOT NULL,
  planted_at    timestamptz NOT NULL,
  ready_at      timestamptz NOT NULL,
  last_harvest  timestamptz,
  next_harvest  timestamptz
);
CREATE INDEX IF NOT EXISTS trees_plot_id_idx ON trees(plot_id);

CREATE TABLE IF NOT EXISTS animals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id       int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  animal_type   text NOT NULL,
  purchased_at  timestamptz NOT NULL,
  last_harvest  timestamptz,
  next_harvest  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS animals_plot_id_idx ON animals(plot_id);

CREATE TABLE IF NOT EXISTS farmers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id         int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  farmer_type     text NOT NULL,
  purchased_at    timestamptz NOT NULL,
  last_harvest_at timestamptz
);
CREATE INDEX IF NOT EXISTS farmers_plot_id_idx ON farmers(plot_id);

CREATE TABLE IF NOT EXISTS inventory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_wallet text NOT NULL REFERENCES players(wallet) ON DELETE CASCADE,
  item_type     text NOT NULL,
  quantity      int  NOT NULL DEFAULT 0,
  UNIQUE(player_wallet, item_type)
);

CREATE TABLE IF NOT EXISTS goblins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id    int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  tier       text NOT NULL CHECK (tier IN ('scout','guard','warlord')),
  hired_at   timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS goblins_plot_id_idx ON goblins(plot_id);

CREATE TABLE IF NOT EXISTS steal_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker      text NOT NULL,
  target_plot   int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  attempted_at  timestamptz DEFAULT now(),
  next_steal_at timestamptz,
  success       boolean DEFAULT false,
  loot_type     text,
  loot_qty      int DEFAULT 0
);

-- ── Activity & economy tables ────────────────────────────────────

CREATE TABLE IF NOT EXISTS plot_events (
  id          bigserial PRIMARY KEY,
  event_type  text NOT NULL,
  plot_id     int  REFERENCES plots(id) ON DELETE CASCADE,
  wallet      text,
  detail      jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plot_events_created_idx ON plot_events(created_at DESC);

CREATE TABLE IF NOT EXISTS trade_offers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id        int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  seller_wallet  text NOT NULL,
  buyer_wallet   text,
  price_usdc     numeric NOT NULL,
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','cancelled')),
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS marketplace_orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_wallet  text NOT NULL,
  item_type      text NOT NULL,
  quantity       int  NOT NULL,
  price_per_unit numeric NOT NULL,
  order_type     text NOT NULL CHECK (order_type IN ('buy','sell')),
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','cancelled')),
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS achievements (
  wallet          text NOT NULL,
  achievement_id  text NOT NULL,
  unlocked_at     timestamptz DEFAULT now(),
  PRIMARY KEY (wallet, achievement_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  referrer_wallet  text NOT NULL,
  referred_wallet  text NOT NULL UNIQUE,
  rewarded         boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_status (
  wallet       text PRIMARY KEY,
  status_text  text,
  updated_at   timestamptz DEFAULT now()
);

-- ── Alliances ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alliances (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE,
  tag            text NOT NULL,
  leader_wallet  text NOT NULL,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alliance_members (
  alliance_id  uuid NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  wallet       text NOT NULL,
  joined_at    timestamptz DEFAULT now(),
  PRIMARY KEY (alliance_id, wallet)
);

-- ── Tribes ───────────────────────────────────────────────────────

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

-- ── Missing columns (safe to run again) ──────────────────────────

ALTER TABLE plots   ADD COLUMN IF NOT EXISTS view_count    int  DEFAULT 0;
ALTER TABLE plots   ADD COLUMN IF NOT EXISTS custom_name   text;
ALTER TABLE plots   ADD COLUMN IF NOT EXISTS upgrade_level int  DEFAULT 1;
ALTER TABLE plots   ADD COLUMN IF NOT EXISTS farmer_count  int  DEFAULT 0;
ALTER TABLE trees   ADD COLUMN IF NOT EXISTS slot          int  DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();

-- ── RLS (enable on all tables) ───────────────────────────────────

ALTER TABLE players          ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops            ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE goblins          ENABLE ROW LEVEL SECURITY;
ALTER TABLE steal_attempts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_offers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_status    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_members    ENABLE ROW LEVEL SECURITY;

-- ── Public read policies (use DO block to skip if already exists) ─

DO $$ BEGIN
  CREATE POLICY "plots_public_read"     ON plots     FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "goblins_public_read"   ON goblins   FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tribes_public_read"    ON tribes    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "alliances_public_read" ON alliances FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "plot_events_public_read" ON plot_events FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
