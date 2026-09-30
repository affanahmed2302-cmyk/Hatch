-- Legendary features schema (NO $$ — safe phone paste)

create table if not exists public.midnight_drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  kind text default 'confession',
  body text not null,
  drop_night date not null,
  created_at timestamptz default now()
);
create index if not exists idx_midnight_night on public.midnight_drops (drop_night, created_at desc);
alter table public.midnight_drops enable row level security;
drop policy if exists "md read" on public.midnight_drops;
create policy "md read" on public.midnight_drops for select to authenticated using (true);
drop policy if exists "md insert" on public.midnight_drops;
create policy "md insert" on public.midnight_drops for insert to authenticated with check (auth.uid() = user_id);

create table if not exists public.radar_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intent text not null,
  zone text default 'campus',
  lat double precision,
  lng double precision,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  unique (user_id)
);
create index if not exists idx_radar_exp on public.radar_intents (expires_at);
alter table public.radar_intents enable row level security;
drop policy if exists "radar read" on public.radar_intents;
create policy "radar read" on public.radar_intents for select to authenticated using (true);
drop policy if exists "radar upsert" on public.radar_intents;
create policy "radar upsert" on public.radar_intents for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "radar update" on public.radar_intents;
create policy "radar update" on public.radar_intents for update to authenticated using (auth.uid() = user_id);
drop policy if exists "radar delete" on public.radar_intents;
create policy "radar delete" on public.radar_intents for delete to authenticated using (auth.uid() = user_id);

create table if not exists public.burner_handshakes (
  id uuid primary key default gen_random_uuid(),
  a_id uuid not null references auth.users(id) on delete cascade,
  b_id uuid not null references auth.users(id) on delete cascade,
  status text default 'pending',
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_burner_exp on public.burner_handshakes (expires_at);
alter table public.burner_handshakes enable row level security;
drop policy if exists "burner read" on public.burner_handshakes;
create policy "burner read" on public.burner_handshakes for select to authenticated using (auth.uid() = a_id or auth.uid() = b_id);
drop policy if exists "burner insert" on public.burner_handshakes;
create policy "burner insert" on public.burner_handshakes for insert to authenticated with check (auth.uid() = a_id);
drop policy if exists "burner update" on public.burner_handshakes;
create policy "burner update" on public.burner_handshakes for update to authenticated using (auth.uid() = a_id or auth.uid() = b_id);

create table if not exists public.ghost_squads (
  id uuid primary key default gen_random_uuid(),
  for_user uuid not null references auth.users(id) on delete cascade,
  member_ids uuid[] not null default '{}',
  reason text,
  score int default 0,
  status text default 'suggested',
  created_at timestamptz default now()
);
alter table public.ghost_squads enable row level security;
drop policy if exists "ghost read" on public.ghost_squads;
create policy "ghost read" on public.ghost_squads for select to authenticated using (auth.uid() = for_user);
drop policy if exists "ghost insert" on public.ghost_squads;
create policy "ghost insert" on public.ghost_squads for insert to authenticated with check (auth.uid() = for_user);
drop policy if exists "ghost update" on public.ghost_squads;
create policy "ghost update" on public.ghost_squads for update to authenticated using (auth.uid() = for_user);
