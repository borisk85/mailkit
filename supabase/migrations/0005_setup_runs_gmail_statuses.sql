-- Ticket #6 — extend setup_runs with Gmail Send-As wizard states and a
-- dedicated gmail_state jsonb column. Forward-only, idempotent.
--
-- Status additions:
--   gmail_instructions_shown  — prepareGmailStep succeeded, UI rendered
--                               SMTP display; awaiting user confirmation.
--   gmail_smtp_ready          — reserved for future ping-verify flow
--                               (tech debt, see TICKETS_BACKLOG) so the
--                               CHECK does not need to change later.
--   gmail_send_as_verified    — confirmGmailSendAs called; user asserts
--                               the Gmail Send-As has been added and
--                               verified.
--   done                      — absolute pipeline terminus (CF + Brevo
--                               + Gmail). Distinct from brevo_done; UI
--                               surfaces the "setup complete" screen
--                               only on this status.
--
-- gmail_state schema (non-secret only — SMTP password is never
-- persisted, see docs/SECURITY.md):
--   target_email       string  — mailbox_local@domain that the user
--                                 will add as Send-As
--   display_name       string  — UI hint for the Gmail display-name
--                                 field (title-cased local-part)
--   smtp_config_version integer — snapshot of BREVO_SMTP_KEY_VERSION at
--                                 prepareGmailStep time; enables a
--                                 future "re-paste required" banner on
--                                 rotation.
--   confirmed_at       timestamptz — set by confirmGmailSendAs.

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
    'gmail_instructions_shown',
    'gmail_smtp_ready',
    'gmail_send_as_verified',
    'done',
    'failed'
  ));

alter table public.setup_runs
  add column if not exists gmail_state jsonb not null default '{}'::jsonb;
