-- setup_runs tracks per-user setup pipeline runs. Forward-only migration.
-- Idempotent where possible (create table if not exists + drop policy if exists).

create table if not exists public.setup_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  mailbox_local text not null,
  status text not null default 'started',
  cf_zone_id text,
  cf_state jsonb not null default '{}'::jsonb,
  error_msg text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists setup_runs_user_id_idx on public.setup_runs(user_id);
create index if not exists setup_runs_created_at_idx on public.setup_runs(created_at desc);

alter table public.setup_runs enable row level security;

drop policy if exists "users_read_own_runs" on public.setup_runs;
create policy "users_read_own_runs" on public.setup_runs
  for select using (auth.uid() = user_id);

drop policy if exists "users_insert_own_runs" on public.setup_runs;
create policy "users_insert_own_runs" on public.setup_runs
  for insert with check (auth.uid() = user_id);

-- Updates only via service_role from server actions. No update policy
-- for authenticated role — clients must not mutate status directly.

-- updated_at auto-update using the existing set_updated_at() function
-- from migration 0002_profiles.sql.
drop trigger if exists setup_runs_updated_at on public.setup_runs;
create trigger setup_runs_updated_at
  before update on public.setup_runs
  for each row
  execute function public.set_updated_at();
