-- Rename brevo_* status values to smtp_* for provider-neutral naming.
-- Part of feat/remove-brevo-legacy: the DB was the last place where
-- "brevo" was still visible to users (via API responses, admin queries,
-- logs). After this migration all new runs receive smtp_* statuses and
-- existing in-progress runs are migrated forward.
--
-- Strategy:
--   1. Replace CHECK constraint — add smtp_* values, remove brevo_*.
--   2. UPDATE all rows (including stuck/abandoned ones) to new names.
--      Terminal rows (done, failed) are unaffected — they never had
--      brevo_* as their status because brevo_* are intermediate states.
--
-- The old constraint is dropped and recreated in one transaction so the
-- DB never has an inconsistent window.

-- Step 1: replace the CHECK constraint.
do $$ begin
  if exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    where c.conname = 'setup_runs_status_check' and t.relname = 'setup_runs'
  ) then
    execute 'alter table public.setup_runs drop constraint setup_runs_status_check';
  end if;
end$$;

alter table public.setup_runs
  add constraint setup_runs_status_check
  check (status in (
    'started',
    'cf_routing_enabled',
    'cf_dns_written',
    'cf_awaiting_destination_verify',
    'cf_rule_created',
    'cf_done',
    -- smtp_* replaces brevo_* (provider-neutral naming)
    'smtp_sender_created',
    'smtp_dns_written',
    'smtp_verified',
    'smtp_done',
    'gmail_instructions_shown',
    'gmail_smtp_ready',
    'gmail_send_as_verified',
    'done',
    'failed'
  ));

-- Step 2: migrate all rows that are stuck at an intermediate brevo_* status.
update public.setup_runs set status = 'smtp_sender_created' where status = 'brevo_sender_created';
update public.setup_runs set status = 'smtp_dns_written'    where status = 'brevo_dns_written';
update public.setup_runs set status = 'smtp_verified'       where status = 'brevo_verified';
update public.setup_runs set status = 'smtp_done'           where status = 'brevo_done';
