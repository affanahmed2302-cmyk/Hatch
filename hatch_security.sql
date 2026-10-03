-- HATCH SECURITY HARDENING
-- Paste in Supabase SQL Editor once. Locks down tables against client abuse.

-- 1) Super-admin helper (email from JWT)
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'affanahmed2302@gmail.com';
$$;

create or replace function public.is_club_admin(p_club uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.club_admins
    where club_id = p_club and user_id = auth.uid()
  ) or public.is_super_admin();
$$;

-- 2) PROFILES — read campus-wide, write only self
alter table public.profiles enable row level security;
drop policy if exists "profiles all" on public.profiles;
drop policy if exists "profiles select" on public.profiles;
drop policy if exists "profiles insert" on public.profiles;
drop policy if exists "profiles update" on public.profiles;
drop policy if exists "profiles delete" on public.profiles;
create policy "profiles select" on public.profiles for select to authenticated using (true);
create policy "profiles insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- no client delete

-- Block clients from setting is_premium / rep_score themselves (trigger)
create or replace function public.protect_profile_privileged()
returns trigger language plpgsql as $$
begin
  if not public.is_super_admin() then
    if TG_OP = 'UPDATE' then
      new.is_premium := old.is_premium;
      new.premium_until := old.premium_until;
      new.rep_score := old.rep_score;
      new.role := old.role;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
before update on public.profiles
for each row execute function public.protect_profile_privileged();

-- 3) MEMBERSHIPS — clients cannot self-grant paid access
alter table public.memberships enable row level security;
drop policy if exists "memberships all" on public.memberships;
drop policy if exists "mem select" on public.memberships;
drop policy if exists "mem insert" on public.memberships;
drop policy if exists "mem update" on public.memberships;
create policy "mem select" on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
-- INSERT/UPDATE only via service role (API routes) — no client policy = blocked for anon/authenticated

-- 4) COUPONS — read active for validate; write admin only
alter table public.coupons enable row level security;
drop policy if exists "coupons all" on public.coupons;
drop policy if exists "coupons select" on public.coupons;
drop policy if exists "coupons write" on public.coupons;
create policy "coupons select" on public.coupons for select to authenticated using (active = true or public.is_super_admin());
create policy "coupons write" on public.coupons for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- 5) PAYMENT ORDERS
alter table public.payment_orders enable row level security;
drop policy if exists "orders all" on public.payment_orders;
drop policy if exists "orders select" on public.payment_orders;
drop policy if exists "orders insert" on public.payment_orders;
create policy "orders select" on public.payment_orders for select to authenticated
  using (user_id = auth.uid() or public.is_super_admin());
create policy "orders insert" on public.payment_orders for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "orders update admin" on public.payment_orders for update to authenticated
  using (public.is_super_admin());

-- 6) MESSAGES — only participants (sender or receiver)
alter table public.messages enable row level security;
drop policy if exists "messages all" on public.messages;
drop policy if exists "messages select" on public.messages;
drop policy if exists "messages insert" on public.messages;
create policy "messages select" on public.messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid() or public.is_super_admin());
create policy "messages insert" on public.messages for insert to authenticated
  with check (sender_id = auth.uid());

-- 7) CLUBS
alter table public.campus_clubs enable row level security;
drop policy if exists "clubs read" on public.campus_clubs;
drop policy if exists "clubs write auth" on public.campus_clubs;
create policy "clubs read" on public.campus_clubs for select to authenticated using (is_active = true or public.is_super_admin());
create policy "clubs write" on public.campus_clubs for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.club_admins enable row level security;
drop policy if exists "club admins all" on public.club_admins;
create policy "club_admins read" on public.club_admins for select to authenticated using (true);
create policy "club_admins write" on public.club_admins for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

alter table public.club_posts enable row level security;
drop policy if exists "club posts all" on public.club_posts;
create policy "club_posts read" on public.club_posts for select to authenticated using (true);
create policy "club_posts insert" on public.club_posts for insert to authenticated
  with check (public.is_club_admin(club_id) and author_id = auth.uid());
create policy "club_posts delete" on public.club_posts for delete to authenticated
  using (public.is_club_admin(club_id) or author_id = auth.uid());

alter table public.club_reactions enable row level security;
drop policy if exists "club reactions all" on public.club_reactions;
create policy "reactions read" on public.club_reactions for select to authenticated using (true);
create policy "reactions write" on public.club_reactions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 8) BADGES — grant admin only
alter table public.user_badges enable row level security;
drop policy if exists "badges all" on public.user_badges;
create policy "badges read" on public.user_badges for select to authenticated using (true);
create policy "badges write" on public.user_badges for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- 9) APP SETTINGS / FEATURE FLAGS — admin write
alter table public.app_settings enable row level security;
drop policy if exists "settings all" on public.app_settings;
create policy "settings read" on public.app_settings for select to authenticated using (true);
create policy "settings write" on public.app_settings for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- 10) SPARKS
alter table public.sparks_profiles enable row level security;
drop policy if exists "sparks profiles all" on public.sparks_profiles;
create policy "sparks_p select" on public.sparks_profiles for select to authenticated using (true);
create policy "sparks_p write" on public.sparks_profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.sparks_likes enable row level security;
drop policy if exists "sparks likes all" on public.sparks_likes;
create policy "sparks_l select" on public.sparks_likes for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy "sparks_l insert" on public.sparks_likes for insert to authenticated
  with check (from_id = auth.uid());

-- 11) SECRET CONFESSIONS
alter table public.secret_confessions enable row level security;
drop policy if exists "confessions all" on public.secret_confessions;
create policy "conf_select" on public.secret_confessions for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid() or public.is_super_admin());
create policy "conf_insert" on public.secret_confessions for insert to authenticated
  with check (from_id = auth.uid());
create policy "conf_update" on public.secret_confessions for update to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

-- 12) PUSH SUBS — own only
alter table public.push_subs enable row level security;
drop policy if exists "push all auth" on public.push_subs;
create policy "push own" on public.push_subs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
