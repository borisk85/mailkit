-- Extend setup_runs.status with the Brevo pipeline states for Ticket #4b.
-- 0003 left status as free-form text; this migration introduces the first
-- CHECK constraint so the DB rejects typos from either the CF or Brevo
-- server actions. Forward-only, idempotent (drop-if-exists + create).

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

alter table public.setup_runs
  add constraint setup_runs_status_check
  check (status in (
    'started',
    'cf_routing_enabled',
    'cf_dns_written',
    'cf_awaiting_destination_verify',
    'cf_rule_created',
    'cf_done',
    'brevo_sender_created',
    'brevo_dns_written',
    'brevo_verified',
    'brevo_done',
    'failed'
  ));
