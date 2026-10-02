-- Dating-relevant fields
alter table public.profiles add column if not exists gender text;
alter table public.sparks_profiles add column if not exists gender text;
alter table public.sparks_profiles add column if not exists meet_pref text;
alter table public.sparks_profiles add column if not exists year_pref text;
alter table public.secret_confessions add column if not exists from_gender text;
