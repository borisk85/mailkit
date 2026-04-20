-- Initial schema: waitlist
-- Idempotent — safe to re-run via Supabase SQL Editor.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

alter table public.waitlist enable row level security;

-- Anon users cannot read/write directly. Inserts go through a Server Action
-- that uses the service role key (bypasses RLS).
-- Owner (authenticated via Supabase Auth with admin role) can read everything.
drop policy if exists "service_role_full_access" on public.waitlist;
create policy "service_role_full_access" on public.waitlist
  for all
  to service_role
  using (true)
  with check (true);
