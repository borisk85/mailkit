-- SES backend swap: replace Brevo pipeline status values with SES equivalents,
-- add ses_state jsonb column for SES-specific state (tenant ID, identity ARN,
-- IAM username). Mirrors the existing cf_state pattern.
--
-- Old Brevo status values (kept in enum for existing rows, removed from
-- constraint so new rows cannot use them):
--   brevo_sender_created, brevo_dns_written, brevo_verified, brevo_done
--
-- New SES status values:
--   ses_tenant_created, ses_identity_created, ses_dkim_pending,
--   ses_identity_verified, ses_credentials_issued, ses_done

-- 1. Drop the existing CHECK constraint (forward-only, idempotent).
do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where c.conname = 'setup_runs_status_check' and t.relname = 'setup_runs'
  ) then
    execute 'alter table public.setup_runs drop constraint setup_runs_status_check';
  end if;
end$$;

-- 2. Add new constraint with SES status values.
--    Historical brevo_* rows in production remain valid (no constraint on
--    existing rows) but new inserts must use the new values.
alter table public.setup_runs
  add constraint setup_runs_status_check
  check (status in (
    'started',
    -- Cloudflare phase (unchanged)
    'cf_routing_enabled',
    'cf_dns_written',
    'cf_awaiting_destination_verify',
    'cf_rule_created',
    'cf_done',
    -- SES phase (replaces brevo_* values)
    'ses_tenant_created',
    'ses_identity_created',
    'ses_dkim_pending',
    'ses_identity_verified',
    'ses_credentials_issued',
    'ses_done',
    -- Gmail phase (unchanged)
    'gmail_credentials_shown',
    'gmail_verified',
    -- Terminal states
    'completed',
    'failed'
  ));

-- 3. Add ses_state jsonb column for SES pipeline state storage.
--    Mirrors cf_state. Stores: { tenantId, identityArn, iamUsername,
--    iamAccessKeyId, dkimTokens[] }
alter table public.setup_runs
  add column if not exists ses_state jsonb not null default '{}'::jsonb;
