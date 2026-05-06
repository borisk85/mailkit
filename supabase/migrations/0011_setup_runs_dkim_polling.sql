-- DKIM async polling support (#async-polling-page).
-- Adds three columns to setup_runs:
--   last_active_at  — updated on every client polling request so cron
--                     can tell whether the browser tab is still open
--   dkim_notify_15m_sent_at — null = 15-min "still verifying" email not
--                             yet sent; set to now() when it fires
--   dkim_notify_30m_sent_at — same for the 30-min "taking longer" email
-- Forward-only migration.

alter table public.setup_runs
  add column if not exists last_active_at timestamptz default null,
  add column if not exists dkim_notify_15m_sent_at timestamptz default null,
  add column if not exists dkim_notify_30m_sent_at timestamptz default null;
