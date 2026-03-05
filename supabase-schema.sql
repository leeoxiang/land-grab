-- Run this in your Supabase SQL editor to set up the database

create extension if not exists "uuid-ossp";

-- Players
create table if not exists players (
  wallet        text primary key,
  balance       numeric default 100,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Plots (seed 100 rows after creating)
create table if not exists plots (
  id             serial primary key,
  tier           text not null check (tier in ('bronze','silver','gold','diamond')),
  col            int not null,
  row            int not null,
  owner_wallet   text references players(wallet) on delete set null,
  locked_tokens  numeric default 0,
  claimed_at     timestamptz,
  last_fish_at   timestamptz
);

-- Crops
create table if not exists crops (
  id          uuid primary key default uuid_generate_v4(),
  plot_id     int references plots(id) on delete cascade,
  slot        int not null,
  crop_type   text not null,
  planted_at  timestamptz not null,
  harvest_at  timestamptz not null,
  harvested   boolean default false
);

-- Trees
create table if not exists trees (
  id            uuid primary key default uuid_generate_v4(),
  plot_id       int references plots(id) on delete cascade,
  tree_type     text not null,
  planted_at    timestamptz not null,
  ready_at      timestamptz not null,
  last_harvest  timestamptz,
  next_harvest  timestamptz
);

-- Animals
create table if not exists animals (
  id            uuid primary key default uuid_generate_v4(),
  plot_id       int references plots(id) on delete cascade,
  animal_type   text not null,
  purchased_at  timestamptz not null,
  last_harvest  timestamptz,
  next_harvest  timestamptz not null
);

-- Farmers (NPCs)
create table if not exists farmers (
  id            uuid primary key default uuid_generate_v4(),
  plot_id       int references plots(id) on delete cascade,
  farmer_type   text not null,
  purchased_at  timestamptz not null
);

-- Player inventory
create table if not exists inventory (
  id             uuid primary key default uuid_generate_v4(),
  player_wallet  text references players(wallet) on delete cascade,
  item_type      text not null,
  quantity       numeric default 0,
  unique(player_wallet, item_type)
);

-- Marketplace orders
create table if not exists marketplace_orders (
  id              uuid primary key default uuid_generate_v4(),
  player_wallet   text references players(wallet) on delete cascade,
  item_type       text not null,
  quantity        numeric not null,
  price_per_unit  numeric not null,
  order_type      text not null check (order_type in ('buy','sell')),
  status          text not null default 'open' check (status in ('open','filled','cancelled')),
  created_at      timestamptz default now()
);

-- Player USDC balances (in-game ledger, separate from on-chain)
create table if not exists player_balances (
  wallet        text primary key references players(wallet),
  balance_usdc  numeric default 0
);

-- Goblins (plot defenders hired by plot owner)
create table if not exists goblins (
  id          uuid primary key default uuid_generate_v4(),
  plot_id     int references plots(id) on delete cascade,
  tier        text not null check (tier in ('scout','guard','warlord')),
  hired_at    timestamptz not null default now(),
  expires_at  timestamptz not null
);

-- Steal attempts (raid history + per-attacker cooldown)
create table if not exists steal_attempts (
  id            uuid primary key default uuid_generate_v4(),
  attacker      text references players(wallet) on delete cascade,
  target_plot   int references plots(id) on delete cascade,
  attempted_at  timestamptz not null default now(),
  next_steal_at timestamptz not null,
  success       boolean not null default false,
  loot_type     text,
  loot_qty      numeric default 0
);

-- Indexes
create index if not exists idx_plots_owner       on plots(owner_wallet);
create index if not exists idx_crops_plot        on crops(plot_id);
create index if not exists idx_animals_plot      on animals(plot_id);
create index if not exists idx_farmers_plot      on farmers(plot_id);
create index if not exists idx_inventory_wallet  on inventory(player_wallet);
create index if not exists idx_orders_item       on marketplace_orders(item_type, status);
create index if not exists idx_orders_wallet     on marketplace_orders(player_wallet);
create index if not exists idx_goblins_plot      on goblins(plot_id);
create index if not exists idx_goblins_expires   on goblins(expires_at);
create index if not exists idx_steal_attacker    on steal_attempts(attacker, attempted_at desc);

-- ============================================================
-- SEED: Insert 100 plots
-- Run this AFTER the table is created.
-- Tier distribution: 50 bronze, 30 silver, 15 gold, 5 diamond
-- ============================================================
do $$
declare
  tiers text[] := array[]::text[];
  i int;
  col int;
  row int;
begin
  -- Build tier array
  for i in 1..50 loop tiers := array_append(tiers, 'bronze'); end loop;
  for i in 1..30 loop tiers := array_append(tiers, 'silver'); end loop;
  for i in 1..15 loop tiers := array_append(tiers, 'gold');   end loop;
  for i in 1..5  loop tiers := array_append(tiers, 'diamond'); end loop;

  -- Shuffle using random sort
  select array_agg(t order by random()) into tiers from unnest(tiers) t;

  -- Insert plots in 10x10 grid
  for i in 1..100 loop
    col := (i - 1) % 10;
    row := (i - 1) / 10;
    insert into plots (tier, col, row) values (tiers[i], col, row)
    on conflict do nothing;
  end loop;
end;
$$;
