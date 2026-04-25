-- Tickets #21 + #22 — anti-abuse infrastructure.
-- Three tables ship together because the cron jobs cross all three on
-- a single tick (read send_counters/deliverability_snapshots → take
-- action → insert abuse_events). Forward-only, idempotent.
--
-- All RLS-enabled, service-role-only — anti-abuse signals must never
-- leak to the customer's own domain through a misconfigured policy.

-- ===== send_counters (Layer 1: rate limits) =====
-- Per-domain rolling counters synced every 5-10 minutes from the
-- Brevo statistics API. We aggregate at three windows (day / hour /
-- minute) so the limit predicate reads one row per window without
-- re-summing events on every check. window_start is the UTC bucket
-- boundary (e.g. 2026-04-26T17:00:00Z for an hour bucket).
create table if not exists public.send_counters (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  window_type text not null check (window_type in ('day', 'hour', 'minute')),
  window_start timestamptz not null,
  count integer not null default 0,
  synced_at timestamptz not null default now(),
  unique (domain, window_type, window_start)
);

create index if not exists send_counters_domain_idx on public.send_counters(domain);
create index if not exists send_counters_window_idx
  on public.send_counters(window_type, window_start desc);

alter table public.send_counters enable row level security;

-- ===== deliverability_snapshots (Layer 2: bounce / complaint / unsub) =====
-- One row per hourly snapshot per domain. action_taken records the
-- decision the cron made when this snapshot was evaluated:
--   null      — under all thresholds, no action
--   'warned'  — over unsubscribe threshold, customer notified
--   'suspended' — over bounce or complaint threshold, domain
--                 deactivated in Brevo + customer notified
-- 90-day retention is enforced by the cron after evaluation.
create table if not exists public.deliverability_snapshots (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  measured_at timestamptz not null default now(),
  window_days integer not null default 7,
  requests_count integer not null default 0,
  bounced_count integer not null default 0,
  complained_count integer not null default 0,
  unsubscribed_count integer not null default 0,
  bounce_rate numeric(6, 3) not null default 0,
  complaint_rate numeric(6, 3) not null default 0,
  unsubscribe_rate numeric(6, 3) not null default 0,
  action_taken text check (action_taken in ('warned', 'suspended'))
);

create index if not exists deliverability_snapshots_domain_idx
  on public.deliverability_snapshots(domain);
create index if not exists deliverability_snapshots_measured_at_idx
  on public.deliverability_snapshots(measured_at desc);

alter table public.deliverability_snapshots enable row level security;

-- ===== abuse_events (audit log spanning both layers) =====
-- Append-only. event_type is open text rather than enum because
-- thresholds and policies will evolve post-launch and we don't want
-- migrations on every threshold tweak.
create table if not exists public.abuse_events (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  event_type text not null,
  threshold_value numeric(10, 3),
  observed_value numeric(10, 3),
  action_taken text not null,
  purchase_id uuid references public.purchases(id) on delete set null,
  snapshot_id uuid references public.deliverability_snapshots(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists abuse_events_domain_idx on public.abuse_events(domain);
create index if not exists abuse_events_created_at_idx
  on public.abuse_events(created_at desc);

alter table public.abuse_events enable row level security;

-- ===== purchases.suspended_at + purchases.suspension_reason =====
-- Per-purchase suspension flag set when a domain gets paused by the
-- anti-abuse loop. `suspended_at` doubles as the boolean predicate
-- (NULL = active) and the audit timestamp. `suspension_reason` is
-- one of the abuse_events.event_type values for cross-referencing.
alter table public.purchases
  add column if not exists suspended_at timestamptz;

alter table public.purchases
  add column if not exists suspension_reason text;

create index if not exists purchases_suspended_at_idx
  on public.purchases(suspended_at)
  where suspended_at is not null;
