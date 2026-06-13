-- Soft-delete support for the account-deletion grace period.
--
-- Instead of hard-deleting auth.users immediately, deleteAccount marks
-- public.profiles.deleted_at. Signing back in within the grace window
-- clears the flag (undo of an accidental delete); a daily purge cron
-- hard-deletes profiles whose deleted_at is older than the window,
-- which cascades through auth.users to setup_runs (and SET NULLs the
-- surviving purchases audit rows).
--
-- Idempotent — safe to re-run via Supabase SQL Editor or the migration
-- runner.

alter table public.profiles
  add column if not exists deleted_at timestamptz;

-- Partial index: the purge cron only ever scans rows pending deletion,
-- which are a tiny minority, so keep the index small.
create index if not exists profiles_deleted_at_idx
  on public.profiles (deleted_at)
  where deleted_at is not null;
