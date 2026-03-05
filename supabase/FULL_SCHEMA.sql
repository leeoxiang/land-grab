-- ─────────────────────────────────────────────────────────────────────────────
-- Land Grab — FULL SCHEMA
-- Run this ONE file in Supabase SQL Editor to set up everything.
-- Safe to re-run: uses IF NOT EXISTS and DROP/CREATE for policies.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Players ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  wallet      text PRIMARY KEY,
  balance     numeric DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

-- ── Plots ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plots (
  id            int  PRIMARY KEY,
  tier          text NOT NULL CHECK (tier IN ('bronze','silver','gold','diamond')),
  col           int  NOT NULL,
  row           int  NOT NULL,
  owner_wallet  text REFERENCES players(wallet) ON DELETE SET NULL,
  locked_tokens numeric DEFAULT 0,
  claimed_at    timestamptz,
  last_fish_at  timestamptz,
  view_count    int  DEFAULT 0,
  custom_name   text,
  upgrade_level int  DEFAULT 1
);

-- ── Crops ─────────────────────────────────────────────────────────────────────
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

-- ── Trees ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trees (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id       int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  tree_type     text NOT NULL,
  slot          int  NOT NULL DEFAULT 0,
  planted_at    timestamptz NOT NULL,
  ready_at      timestamptz NOT NULL,
  last_harvest  timestamptz,
  next_harvest  timestamptz
);
CREATE INDEX IF NOT EXISTS trees_plot_id_idx ON trees(plot_id);

-- ── Animals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS animals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id       int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  animal_type   text NOT NULL,
  purchased_at  timestamptz NOT NULL,
  last_harvest  timestamptz,
  next_harvest  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS animals_plot_id_idx ON animals(plot_id);

-- ── Farmers ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farmers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id          int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  farmer_type      text NOT NULL,
  purchased_at     timestamptz NOT NULL,
  last_harvest_at  timestamptz,
  UNIQUE(plot_id, farmer_type)
);

-- ── Inventory ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_wallet  text NOT NULL REFERENCES players(wallet) ON DELETE CASCADE,
  item_type      text NOT NULL,
  quantity       int  NOT NULL DEFAULT 0,
  UNIQUE(player_wallet, item_type)
);
CREATE INDEX IF NOT EXISTS inventory_wallet_idx ON inventory(player_wallet);

-- ── Marketplace Orders ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_wallet   text NOT NULL REFERENCES players(wallet) ON DELETE CASCADE,
  item_type       text NOT NULL,
  quantity        int  NOT NULL,
  price_per_unit  numeric NOT NULL,
  order_type      text NOT NULL CHECK (order_type IN ('buy','sell')),
  status          text NOT NULL DEFAULT 'open' CHECK (status IN ('open','filled','cancelled')),
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_item_type_idx     ON marketplace_orders(item_type, order_type, status);
CREATE INDEX IF NOT EXISTS orders_player_wallet_idx ON marketplace_orders(player_wallet);

-- ── Goblins ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goblins (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id     int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  tier        text NOT NULL CHECK (tier IN ('scout','guard','warlord')),
  hired_at    timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS goblins_plot_id_idx    ON goblins(plot_id);
CREATE INDEX IF NOT EXISTS goblins_expires_at_idx ON goblins(expires_at);

-- ── Steal Attempts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS steal_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker      text NOT NULL REFERENCES players(wallet) ON DELETE CASCADE,
  target_plot   int  NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  attempted_at  timestamptz NOT NULL DEFAULT now(),
  next_steal_at timestamptz NOT NULL,
  success       boolean NOT NULL,
  loot_type     text,
  loot_qty      int
);
CREATE INDEX IF NOT EXISTS steal_attacker_idx ON steal_attempts(attacker, next_steal_at DESC);

-- ── Plot Events (activity feed) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plot_events (
  id          bigserial PRIMARY KEY,
  event_type  text NOT NULL,
  plot_id     int  REFERENCES plots(id) ON DELETE CASCADE,
  wallet      text,
  detail      jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plot_events_created_idx ON plot_events(created_at DESC);

-- ── Alliances ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alliances (
  id             bigserial PRIMARY KEY,
  name           text NOT NULL UNIQUE,
  tag            text NOT NULL,
  leader_wallet  text NOT NULL,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alliance_members (
  alliance_id  bigint REFERENCES alliances(id) ON DELETE CASCADE,
  wallet       text NOT NULL,
  joined_at    timestamptz DEFAULT now(),
  PRIMARY KEY (alliance_id, wallet)
);

-- ── Trade Offers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_offers (
  id             bigserial PRIMARY KEY,
  plot_id        int  REFERENCES plots(id) ON DELETE CASCADE,
  seller_wallet  text NOT NULL,
  buyer_wallet   text,
  price_usdc     numeric(10,2) NOT NULL,
  status         text DEFAULT 'open',
  created_at     timestamptz DEFAULT now()
);

-- ── Achievements ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS achievements (
  id              bigserial PRIMARY KEY,
  wallet          text NOT NULL,
  achievement_id  text NOT NULL,
  unlocked_at     timestamptz DEFAULT now(),
  UNIQUE(wallet, achievement_id)
);

-- ── Referrals ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id               bigserial PRIMARY KEY,
  referrer_wallet  text NOT NULL,
  referred_wallet  text NOT NULL UNIQUE,
  rewarded         boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- ── Player Status ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_status (
  wallet       text PRIMARY KEY,
  status_text  text,
  updated_at   timestamptz DEFAULT now()
);

-- ── Player Positions (real-time multiplayer) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS player_positions (
  wallet     text PRIMARY KEY,
  x          real NOT NULL,
  y          real NOT NULL,
  col        int  NOT NULL DEFAULT 0,
  row        int  NOT NULL DEFAULT 0,
  char_id    text NOT NULL DEFAULT 'player',
  updated_at timestamptz DEFAULT now()
);

-- ── Chat Messages ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         bigserial PRIMARY KEY,
  wallet     text NOT NULL,
  message    text NOT NULL CHECK (char_length(message) <= 120),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON chat_messages(created_at DESC);

-- ── Tribes ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tribes (
  id             bigserial PRIMARY KEY,
  name           text NOT NULL UNIQUE,
  tag            text NOT NULL CHECK (char_length(tag) BETWEEN 2 AND 4),
  leader_wallet  text NOT NULL,
  plot_id        int  REFERENCES plots(id) ON DELETE SET NULL,
  description    text CHECK (char_length(description) <= 120),
  invite_code    text UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tribes_leader_idx ON tribes(leader_wallet);

CREATE TABLE IF NOT EXISTS tribe_members (
  tribe_id  bigint REFERENCES tribes(id) ON DELETE CASCADE,
  wallet    text NOT NULL,
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (tribe_id, wallet)
);
CREATE INDEX IF NOT EXISTS tribe_members_wallet_idx ON tribe_members(wallet);

-- ── RPC Helpers ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_inventory(
  p_wallet    text,
  p_item_type text,
  p_qty       int
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO inventory (player_wallet, item_type, quantity)
  VALUES (p_wallet, p_item_type, p_qty)
  ON CONFLICT (player_wallet, item_type)
  DO UPDATE SET quantity = inventory.quantity + excluded.quantity;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_inventory(
  p_wallet    text,
  p_item_type text,
  p_qty       int
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  current_qty int;
BEGIN
  SELECT quantity INTO current_qty
  FROM inventory
  WHERE player_wallet = p_wallet AND item_type = p_item_type;

  IF current_qty IS NULL OR current_qty < p_qty THEN
    RETURN false;
  END IF;

  UPDATE inventory
  SET quantity = quantity - p_qty
  WHERE player_wallet = p_wallet AND item_type = p_item_type;

  RETURN true;
END;
$$;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE players            ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots              ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops              ENABLE ROW LEVEL SECURITY;
ALTER TABLE trees              ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE goblins            ENABLE ROW LEVEL SECURITY;
ALTER TABLE steal_attempts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plot_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliances          ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_offers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_status      ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_positions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribe_members      ENABLE ROW LEVEL SECURITY;

-- Public read policies (drop first so re-runs are safe)
DROP POLICY IF EXISTS "plots_public_read"     ON plots;
DROP POLICY IF EXISTS "goblins_public_read"   ON goblins;
DROP POLICY IF EXISTS "events_public_read"    ON plot_events;
DROP POLICY IF EXISTS "chat_public_read"      ON chat_messages;
DROP POLICY IF EXISTS "tribes_public_read"    ON tribes;
DROP POLICY IF EXISTS "members_public_read"   ON tribe_members;
DROP POLICY IF EXISTS "positions_public_read" ON player_positions;

CREATE POLICY "plots_public_read"     ON plots          FOR SELECT USING (true);
CREATE POLICY "goblins_public_read"   ON goblins        FOR SELECT USING (true);
CREATE POLICY "events_public_read"    ON plot_events    FOR SELECT USING (true);
CREATE POLICY "chat_public_read"      ON chat_messages  FOR SELECT USING (true);
CREATE POLICY "tribes_public_read"    ON tribes         FOR SELECT USING (true);
CREATE POLICY "members_public_read"   ON tribe_members  FOR SELECT USING (true);
CREATE POLICY "positions_public_read" ON player_positions FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- OPTIONAL: Seed 100 plots if you haven't used /api/generator/save yet.
-- Uncomment and run once if the plots table is empty:
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT INTO plots (id, tier, col, row)
-- SELECT
--   n,
--   CASE
--     WHEN n <= 50 THEN 'bronze'
--     WHEN n <= 80 THEN 'silver'
--     WHEN n <= 95 THEN 'gold'
--     ELSE 'diamond'
--   END,
--   (n - 1) % 10,
--   (n - 1) / 10
-- FROM generate_series(1, 100) AS n
-- ON CONFLICT (id) DO NOTHING;
