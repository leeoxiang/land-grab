-- ─────────────────────────────────────────────────────────────────────────────
-- Farm Game — Supabase Schema
-- Run this in the Supabase SQL editor to create all tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Players ──────────────────────────────────────────────────────────────────
create table if not exists players (
  wallet      text primary key,
  balance     numeric default 0,
  created_at  timestamptz default now()
);

-- ── Plots ────────────────────────────────────────────────────────────────────
create table if not exists plots (
  id            int  primary key,
  tier          text not null check (tier in ('bronze', 'silver', 'gold', 'diamond')),
  col           int  not null,
  row           int  not null,
  owner_wallet  text references players(wallet) on delete set null,
  locked_tokens numeric default 0,
  claimed_at    timestamptz,
  last_fish_at  timestamptz     -- fishing cooldown tracker
);

-- Seed all 100 plots (run once after creating the table)
-- Tiers match config/game.ts: bronze=50, silver=30, gold=15, diamond=5
-- The generator assigns tiers during approval; populate via /api/generator/save
-- If starting fresh, insert placeholder rows:
-- insert into plots (id, tier, col, row)
-- select
--   n,
--   case
--     when n <= 50  then 'bronze'
--     when n <= 80  then 'silver'
--     when n <= 95  then 'gold'
--     else               'diamond'
--   end,
--   (n - 1) % 10,
--   (n - 1) / 10
-- from generate_series(1, 100) as n;

-- ── Crops ─────────────────────────────────────────────────────────────────────
create table if not exists crops (
  id          uuid primary key default gen_random_uuid(),
  plot_id     int  not null references plots(id) on delete cascade,
  slot        int  not null,
  crop_type   text not null,
  planted_at  timestamptz not null,
  harvest_at  timestamptz not null,
  harvested   boolean default false
);

create index if not exists crops_plot_id_idx on crops(plot_id);

-- ── Trees ─────────────────────────────────────────────────────────────────────
create table if not exists trees (
  id            uuid primary key default gen_random_uuid(),
  plot_id       int  not null references plots(id) on delete cascade,
  tree_type     text not null,
  planted_at    timestamptz not null,
  ready_at      timestamptz not null,
  last_harvest  timestamptz,
  next_harvest  timestamptz
);

create index if not exists trees_plot_id_idx on trees(plot_id);

-- ── Animals ───────────────────────────────────────────────────────────────────
create table if not exists animals (
  id            uuid primary key default gen_random_uuid(),
  plot_id       int  not null references plots(id) on delete cascade,
  animal_type   text not null,
  purchased_at  timestamptz not null,
  last_harvest  timestamptz,
  next_harvest  timestamptz not null
);

create index if not exists animals_plot_id_idx on animals(plot_id);

-- ── Farmers ───────────────────────────────────────────────────────────────────
create table if not exists farmers (
  id               uuid primary key default gen_random_uuid(),
  plot_id          int  not null references plots(id) on delete cascade,
  farmer_type      text not null,
  purchased_at     timestamptz not null,
  last_harvest_at  timestamptz,
  unique(plot_id, farmer_type)
);

-- ── Inventory ─────────────────────────────────────────────────────────────────
create table if not exists inventory (
  id             uuid primary key default gen_random_uuid(),
  player_wallet  text not null references players(wallet) on delete cascade,
  item_type      text not null,
  quantity       int  not null default 0,
  unique(player_wallet, item_type)
);

create index if not exists inventory_wallet_idx on inventory(player_wallet);

-- ── Marketplace Orders ────────────────────────────────────────────────────────
create table if not exists marketplace_orders (
  id              uuid primary key default gen_random_uuid(),
  player_wallet   text not null references players(wallet) on delete cascade,
  item_type       text not null,
  quantity        int  not null,
  price_per_unit  numeric not null,
  order_type      text not null check (order_type in ('buy', 'sell')),
  status          text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  created_at      timestamptz default now()
);

create index if not exists orders_item_type_idx      on marketplace_orders(item_type, order_type, status);
create index if not exists orders_player_wallet_idx  on marketplace_orders(player_wallet);

-- ── RPC helper: increment inventory (upsert + add qty) ───────────────────────
create or replace function increment_inventory(
  p_wallet    text,
  p_item_type text,
  p_qty       int
) returns void language plpgsql as $$
begin
  insert into inventory (player_wallet, item_type, quantity)
  values (p_wallet, p_item_type, p_qty)
  on conflict (player_wallet, item_type)
  do update set quantity = inventory.quantity + excluded.quantity;
end;
$$;

-- ── RPC helper: decrement inventory (returns false if insufficient) ───────────
create or replace function decrement_inventory(
  p_wallet    text,
  p_item_type text,
  p_qty       int
) returns boolean language plpgsql as $$
declare
  current_qty int;
begin
  select quantity into current_qty
  from inventory
  where player_wallet = p_wallet and item_type = p_item_type;

  if current_qty is null or current_qty < p_qty then
    return false;
  end if;

  update inventory
  set quantity = quantity - p_qty
  where player_wallet = p_wallet and item_type = p_item_type;

  return true;
end;
$$;

-- ── Goblins (plot defenders) ──────────────────────────────────────────────────
create table if not exists goblins (
  id          uuid primary key default gen_random_uuid(),
  plot_id     int  not null references plots(id) on delete cascade,
  tier        text not null check (tier in ('scout', 'guard', 'warlord')),
  hired_at    timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index if not exists goblins_plot_id_idx   on goblins(plot_id);
create index if not exists goblins_expires_at_idx on goblins(expires_at);

-- ── Steal Attempts ────────────────────────────────────────────────────────────
create table if not exists steal_attempts (
  id            uuid primary key default gen_random_uuid(),
  attacker      text not null references players(wallet) on delete cascade,
  target_plot   int  not null references plots(id) on delete cascade,
  attempted_at  timestamptz not null default now(),
  next_steal_at timestamptz not null,
  success       boolean not null,
  loot_type     text,
  loot_qty      int
);

create index if not exists steal_attacker_idx on steal_attempts(attacker, next_steal_at desc);

-- ── Row Level Security (enable on all tables) ─────────────────────────────────
alter table players             enable row level security;
alter table plots               enable row level security;
alter table crops               enable row level security;
alter table trees               enable row level security;
alter table animals             enable row level security;
alter table farmers             enable row level security;
alter table inventory           enable row level security;
alter table marketplace_orders  enable row level security;
alter table goblins             enable row level security;
alter table steal_attempts      enable row level security;

-- Public read-only on plots (anyone can see the world map)
create policy "plots_public_read"   on plots   for select using (true);
-- Public read on goblins (attacker can see if plot is defended)
create policy "goblins_public_read" on goblins for select using (true);
-- Service role bypasses RLS for all API routes (uses service_role key)
-- No additional anon policies needed since all writes go through server-side API.
