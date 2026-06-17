-- Hard guarantee: at most ONE active (non-failed) setup_run per
-- user+zone+mailbox. The app already reuses an existing run instead of
-- creating a duplicate (startSetupRun), but this DB-level partial unique
-- index makes a duplicate IMPOSSIBLE even under a concurrent double-submit
-- race — so the dashboard can never fill with duplicate cards for anyone.
--
-- Failed runs are excluded so a user can retry / re-setup after a failure.
-- Pre-existing duplicates were collapsed to a single row before this ran.
-- Forward-only, idempotent.
create unique index if not exists setup_runs_one_active_per_mailbox
  on public.setup_runs (user_id, cf_zone_id, mailbox_local)
  where status <> 'failed';
