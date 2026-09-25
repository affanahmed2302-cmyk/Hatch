-- HATCH FIX: missing tables only — paste ALL in Supabase SQL Editor → Run

create table if not exists public.vibe_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  zone text not null,
  check_date date not null default (timezone('Asia/Kolkata', now()))::date,
  created_at timestamptz default now(),
  unique(user_id, check_date)
);

create table if not exists public.campus_perks (
  id uuid primary key default gen_random_uuid(),
  merchant_name text not null,
  category text default 'Food',
  title text not null,
  description text,
  discount_label text not null,
  location_hint text default 'Bull Temple Road',
  is_active boolean default true,
  created_at timestamptz default now()
);

insert into public.campus_perks (merchant_name, category, title, description, discount_label, location_hint)
select * from (values
  ('Cafe Coffee Day', 'Food', 'Student brew', 'Show hatch membership', '10% off', 'Bull Temple Road'),
  ('Dominos BT Road', 'Food', 'Team fuel', 'Groups of 3+', 'Buy 1 get 1 base', 'Near BMSCE'),
  ('A2B', 'Food', 'Quick bite', 'Verified students', '₹50 off above ₹299', 'Bull Temple Road'),
  ('Xerox Point', 'Print', 'Hack pack', 'Reports & posters', '15% off bulk', 'Opp. BMSCE'),
  ('Decathlon partner', 'Sports', 'Turf ready', 'Gear rental', '20% student', 'Nearby')
) as v(merchant_name, category, title, description, discount_label, location_hint)
where not exists (select 1 from public.campus_perks limit 1);

create table if not exists public.live_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  campus_id text default 'BMSCE',
  location_tag text default 'Campus',
  message text not null,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz default now()
);

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.teams add column if not exists members_needed int default 4;

alter table public.vibe_checks enable row level security;
alter table public.campus_perks enable row level security;
alter table public.live_intents enable row level security;
alter table public.team_messages enable row level security;

drop policy if exists "vc_all" on public.vibe_checks;
create policy "vc_all" on public.vibe_checks for all to authenticated using (true) with check (auth.uid() = user_id);

drop policy if exists "pk_sel" on public.campus_perks;
create policy "pk_sel" on public.campus_perks for select to authenticated using (true);

drop policy if exists "li_all" on public.live_intents;
drop policy if exists "li_sel" on public.live_intents;
create policy "li_all" on public.live_intents for all to authenticated using (true) with check (auth.uid() = user_id);
create policy "li_sel" on public.live_intents for select to authenticated using (true);

drop policy if exists "tm_msg_all" on public.team_messages;
create policy "tm_msg_all" on public.team_messages for all to authenticated using (true) with check (auth.uid() = sender_id);

do $$ begin alter publication supabase_realtime add table public.team_messages; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.live_intents; exception when duplicate_object then null; end $$;

notify pgrst, 'reload schema';
