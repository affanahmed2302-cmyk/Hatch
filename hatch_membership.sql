-- Memberships, coupons, legends chat (NO $$ — phone safe)

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null,
  status text default 'active',
  starts_at timestamptz default now(),
  ends_at timestamptz not null,
  amount_inr int default 0,
  coupon_code text,
  payment_ref text,
  created_at timestamptz default now()
);
create index if not exists idx_memberships_user on public.memberships (user_id, product);
alter table public.memberships enable row level security;
drop policy if exists "mem read own" on public.memberships;
create policy "mem read own" on public.memberships for select to authenticated using (auth.uid() = user_id);
drop policy if exists "mem insert own" on public.memberships;
create policy "mem insert own" on public.memberships for insert to authenticated with check (auth.uid() = user_id);

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product text not null,
  amount_inr int not null,
  coupon_code text,
  upi_ref text,
  status text default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
alter table public.payment_orders enable row level security;
drop policy if exists "po read" on public.payment_orders;
create policy "po read" on public.payment_orders for select to authenticated using (true);
drop policy if exists "po insert" on public.payment_orders;
create policy "po insert" on public.payment_orders for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "po update" on public.payment_orders;
create policy "po update" on public.payment_orders for update to authenticated using (true);

create table if not exists public.coupons (
  code text primary key,
  product text not null,
  discount_pct int default 100,
  max_uses int default 50,
  used_count int default 0,
  active boolean default true,
  note text,
  created_at timestamptz default now()
);
alter table public.coupons enable row level security;
drop policy if exists "coupons read" on public.coupons;
create policy "coupons read" on public.coupons for select to authenticated using (true);
drop policy if exists "coupons write" on public.coupons;
create policy "coupons write" on public.coupons for all to authenticated using (true) with check (true);

create table if not exists public.legends_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);
create index if not exists idx_legends_msg on public.legends_messages (created_at desc);
alter table public.legends_messages enable row level security;
drop policy if exists "legends read" on public.legends_messages;
create policy "legends read" on public.legends_messages for select to authenticated using (true);
drop policy if exists "legends insert" on public.legends_messages;
create policy "legends insert" on public.legends_messages for insert to authenticated with check (auth.uid() = sender_id);

-- dating profile extras
alter table public.sparks_profiles add column if not exists prompts text;
alter table public.sparks_profiles add column if not exists meet_pref text;
alter table public.sparks_profiles add column if not exists year_pref text;
alter table public.sparks_profiles add column if not exists show_dept boolean default true;
