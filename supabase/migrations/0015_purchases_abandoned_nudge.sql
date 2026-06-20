-- Track whether the "abandoned setup" nudge email has been sent
-- so the cron sends it exactly once per purchase.
alter table public.purchases
  add column if not exists abandoned_nudge_sent_at timestamptz;
