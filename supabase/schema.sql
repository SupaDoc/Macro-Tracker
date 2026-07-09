-- 22nd Century Caveman (22CC) — Phase 1 schema
-- Blocks -> Meal/Day/Week compositions -> Log entries
-- Run this once in the Supabase SQL editor (idempotent: safe to re-run).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- blocks: modular, repeatable meal units.
-- Macros are NEVER stored pre-summed. `ingredients` holds one row per
-- ingredient, each already scaled to the quantity used in ONE instance of
-- the Block. All totals (block-level, meal-level, day-level) are computed
-- at render time in the client by summing ingredient macros x servings.
-- ---------------------------------------------------------------------------
create table if not exists public.blocks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name             text not null check (char_length(trim(name)) > 0),
  notes            text,
  -- ingredients: jsonb array of
  --   { id, fdc_id, name, grams, calories, protein_g, carbs_g, fat_g, fiber_g }
  ingredients      jsonb not null default '[]'::jsonb,
  default_servings numeric not null default 1 check (default_servings > 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

comment on table public.blocks is
  'A Block is a reference, not a copy. The same block id is reused across meal_plans/log_entries; never duplicate its ingredient data.';

-- ---------------------------------------------------------------------------
-- meal_plans: generic composition node covering Meal / Day Plan / Week Plan.
-- A Meal's items reference Blocks; a Day Plan's items reference Meals (or
-- Blocks directly); a Week Plan's items reference Day Plans. Kept generic
-- in one table for V0.1 instead of three near-identical tables.
-- ---------------------------------------------------------------------------
create table if not exists public.meal_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type       text not null check (type in ('meal', 'day', 'week')),
  name       text not null check (char_length(trim(name)) > 0),
  plan_date  date, -- used by 'day' plans; null for meal/week templates
  -- items: jsonb array of { ref_type: 'block'|'meal_plan', ref_id, servings }
  items      jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- log_entries: what was actually logged as eaten.
-- client_key is a client-generated uuid so a retried request (flaky network,
-- double-tap) upserts instead of duplicating the log line.
-- ---------------------------------------------------------------------------
create table if not exists public.log_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_key  uuid not null default gen_random_uuid(),
  ref_type    text not null check (ref_type in ('block', 'meal_plan')),
  ref_id      uuid not null,
  servings    numeric not null default 1 check (servings > 0),
  log_date    date not null default (now() at time zone 'utc')::date,
  logged_at   timestamptz not null default now(),
  note        text,
  created_at  timestamptz not null default now(),
  constraint log_entries_idempotent unique (user_id, client_key)
);

create index if not exists log_entries_user_date_idx
  on public.log_entries (user_id, log_date);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists blocks_set_updated_at on public.blocks;
create trigger blocks_set_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

drop trigger if exists meal_plans_set_updated_at on public.meal_plans;
create trigger meal_plans_set_updated_at
  before update on public.meal_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — every row is private to the user that owns it.
-- ---------------------------------------------------------------------------
alter table public.blocks enable row level security;
alter table public.meal_plans enable row level security;
alter table public.log_entries enable row level security;

drop policy if exists blocks_owner_all on public.blocks;
create policy blocks_owner_all on public.blocks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists meal_plans_owner_all on public.meal_plans;
create policy meal_plans_owner_all on public.meal_plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists log_entries_owner_all on public.log_entries;
create policy log_entries_owner_all on public.log_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: ref_id in meal_plans.items / log_entries.ref_id is intentionally not
-- a foreign key (it can point at either blocks or meal_plans depending on
-- ref_type). Integrity is enforced app-side for V0.1.
