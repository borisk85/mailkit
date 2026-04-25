-- Ticket #7 — Lemon Squeezy payment integration.
-- Three tables land together because the webhook handler writes across
-- all three in one transaction: dedupe via webhook_events, mutate
-- purchases, append to refunds audit log.
--
-- All three are service-role-only (no client policies). Client reads
-- purchase status via server actions / RSC, not direct RLS queries.
-- Forward-only, idempotent (create table if not exists).

-- ===== purchases =====
-- One row per completed Lemon Squeezy order. user_id is nullable
-- because the landing CTA lands unauthenticated customers on LS
-- directly; we link them via the thank-you OAuth flow (user_email
-- match + recent-order timestamp heuristic, see
-- app/[locale]/app/setup/page.tsx link logic).
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  ls_order_id text unique not null,
  ls_order_identifier text,
  amount_cents integer not null,
  currency text not null,
  status text not null check (status in (
    'paid',
    'refunded',
    'partially_refunded',
    'fraudulent'
  )),
  test_mode boolean not null default false,
  custom_data jsonb not null default '{}'::jsonb,
  user_email text not null,
  created_at timestamptz not null default now(),
  refunded_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on public.purchases(user_id);
create index if not exists purchases_user_email_idx on public.purchases(lower(user_email));
create index if not exists purchases_created_at_idx on public.purchases(created_at desc);

alter table public.purchases enable row level security;

drop trigger if exists purchases_updated_at on public.purchases;
create trigger purchases_updated_at
  before update on public.purchases
  for each row
  execute function public.set_updated_at();

-- ===== refunds =====
-- Audit log of every refund, system-triggered or manual. One row per
-- refund event; if LS partially-refunds twice, two rows here. run_id
-- is set when the refund was auto-triggered by a failed setup_run and
-- null for manual / 30-day refunds.
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases(id) on delete restrict,
  run_id uuid references public.setup_runs(id) on delete set null,
  amount_cents integer not null,
  currency text not null,
  reason text not null check (reason in (
    'automation_failure',
    'functional_30day_request',
    'fraud_dispute',
    'manual_support_discretion'
  )),
  triggered_by text not null check (triggered_by in (
    'system',
    'support',
    'user_dispute'
  )),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists refunds_purchase_id_idx on public.refunds(purchase_id);
create index if not exists refunds_run_id_idx on public.refunds(run_id);

alter table public.refunds enable row level security;

-- ===== webhook_events =====
-- Observability + idempotency for all incoming webhook POSTs. source
-- is prepared for future providers (currently only lemon_squeezy).
-- body_hash is SHA-256 of the raw request body — LS does not send
-- a stable event-id header, so hashing the payload is our dedupe key.
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'lemon_squeezy',
  event_name text not null,
  body_hash text not null,
  body jsonb not null,
  processed boolean not null default false,
  processing_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists webhook_events_source_hash_idx
  on public.webhook_events(source, body_hash);
create index if not exists webhook_events_event_name_idx
  on public.webhook_events(event_name);

alter table public.webhook_events enable row level security;
