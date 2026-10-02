-- Professional vs Social profile visibility
alter table public.profiles add column if not exists profile_mode text default 'both';
-- values: professional | social | both
