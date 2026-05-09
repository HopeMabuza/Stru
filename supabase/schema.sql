-- Stru Supabase Schema
-- Run this once in the Supabase SQL editor

create table users (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  privy_id text unique not null,
  created_at timestamptz default now()
);

create table pools (
  id uuid primary key default gen_random_uuid(),
  program_pda text not null,
  goal_text text not null,
  goal_json jsonb not null,
  stake_amount numeric not null,
  budget numeric not null,
  deadline timestamptz not null,
  status text default 'active',
  creator_id uuid references users(id),
  created_at timestamptz default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references pools(id),
  wallet_address text not null,
  status text default 'pending',
  joined_at timestamptz default now(),
  unique(pool_id, wallet_address)
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid references pools(id),
  wallet_address text not null,
  file_url text not null,
  ai_verdict text not null,
  ai_reason text not null,
  what_would_count text,
  confidence numeric,
  submitted_at timestamptz default now()
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  badge_type text not null,
  mint_address text,
  pool_id uuid references pools(id),
  earned_at timestamptz default now()
);

-- Enable Row Level Security
alter table users enable row level security;
alter table pools enable row level security;
alter table participants enable row level security;
alter table evidence enable row level security;
alter table badges enable row level security;

-- Policies: service_role bypasses RLS (used by backend)
-- Anon/authenticated can read pools and participants for invite links

create policy "Public can read active pools"
  on pools for select
  using (status = 'active');

create policy "Public can read participants"
  on participants for select
  using (true);

create policy "Public can read badges"
  on badges for select
  using (true);

-- Storage bucket: evidence (run in Supabase dashboard → Storage)
-- bucket name: evidence
-- public read: true
-- authenticated write: true
