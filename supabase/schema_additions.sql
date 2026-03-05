-- ─────────────────────────────────────────────────────────────────────────────
-- Land Grab — Schema Additions (run in Supabase SQL editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Plot activity feed
CREATE TABLE IF NOT EXISTS plot_events (
  id          bigserial PRIMARY KEY,
  event_type  text NOT NULL,         -- 'claim','harvest','buy_animal','upgrade','trade','fish'
  plot_id     int  REFERENCES plots(id) ON DELETE CASCADE,
  wallet      text,
  detail      jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plot_events_created_idx ON plot_events(created_at DESC);

-- 2. Visit counter on plots
ALTER TABLE plots ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0;

-- 3. Alliances
CREATE TABLE IF NOT EXISTS alliances (
  id             bigserial PRIMARY KEY,
  name           text NOT NULL UNIQUE,
  tag            text NOT NULL,           -- 3-4 char display tag
  leader_wallet  text NOT NULL,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alliance_members (
  alliance_id  bigint REFERENCES alliances(id) ON DELETE CASCADE,
  wallet       text   NOT NULL,
  joined_at    timestamptz DEFAULT now(),
  PRIMARY KEY (alliance_id, wallet)
);

-- 4. Plot trade offers
CREATE TABLE IF NOT EXISTS trade_offers (
  id             bigserial PRIMARY KEY,
  plot_id        int  REFERENCES plots(id) ON DELETE CASCADE,
  seller_wallet  text NOT NULL,
  buyer_wallet   text,                    -- NULL = open to anyone
  price_usdc     numeric(10,2) NOT NULL,
  status         text DEFAULT 'open',     -- 'open','accepted','cancelled'
  created_at     timestamptz DEFAULT now()
);

-- 5. Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id              bigserial PRIMARY KEY,
  wallet          text NOT NULL,
  achievement_id  text NOT NULL,
  unlocked_at     timestamptz DEFAULT now(),
  UNIQUE(wallet, achievement_id)
);

-- 6. Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id               bigserial PRIMARY KEY,
  referrer_wallet  text NOT NULL,
  referred_wallet  text NOT NULL UNIQUE,
  rewarded         boolean DEFAULT false,
  created_at       timestamptz DEFAULT now()
);

-- 7. Player chat status
CREATE TABLE IF NOT EXISTS player_status (
  wallet       text PRIMARY KEY,
  status_text  text,
  updated_at   timestamptz DEFAULT now()
);

-- 8. Missed columns from prior sessions
ALTER TABLE plots ADD COLUMN IF NOT EXISTS custom_name    text;
ALTER TABLE plots ADD COLUMN IF NOT EXISTS upgrade_level  int DEFAULT 1;
