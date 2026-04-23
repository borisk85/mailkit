# MailKit — Security posture

Short reference for known architectural trade-offs. Update in place; we
don't keep a separate audit log.

## Shared Brevo SMTP model (Ticket #6)

**What we do.** The Gmail Send-As wizard hands every customer the same
SMTP host, login, and key — our Brevo account credentials. The customer
pastes them into their own Gmail SMTP settings; Gmail authenticates to
`smtp-relay.brevo.com` as us, From-header carries their
`mailbox@their-domain.com`. Brevo gates the From-address by domain-level
DKIM + brevo-code records (written by our Ticket #4b pipeline); they do
not gate it by per-customer SMTP credentials. Per-customer SMTP keys do
not exist on Brevo — the API does not expose key management; all
generation is UI-only.

**Known risks we accept for MVP.**

1. **Shared abuse surface.** A malicious customer with their pasted
   credentials can send from any authenticated domain on our account, or
   abuse our outbound quota by sending beyond what they purchased.
2. **Rotation cascade.** If we rotate the SMTP key to stop an abuser,
   every previously-setup customer loses Gmail Send-As at the same time
   until they re-paste the new credentials.
3. **Shared IP reputation.** One customer's spam hurts everyone's
   deliverability, because Brevo ties reputation to the account, not the
   sending domain.

**Compensating controls (land as tech debt, not MVP blockers).**

- **Abuse detection + rate limits on our side.** Daily outbound cap per
  `setup_run`, enforced via `/v3/smtp/statistics/events` polling + UI
  block on breach. Tracked in [TICKETS_BACKLOG.md](TICKETS_BACKLOG.md)
  "Tech debt".
- **Rotation plumbing (half-built).** `.env` holds
  `BREVO_SMTP_KEY_VERSION`; `setup_runs.gmail_state.smtp_config_version`
  snapshots it at `prepareGmailStep` time. When version in env exceeds
  version in gmail_state, future UI can show a "re-paste required"
  banner. No banner yet — we build the UI when the first rotation
  actually happens, not on spec.
- **Brevo account monitoring.** Owner watches
  `https://app.brevo.com/settings/subaccounts` for suspensions; there is
  no alerting pipeline yet.

**Non-persistence of SMTP password.** `prepareGmailStep` reads the
password from env and returns it through the server action response to
the browser. We never write it to the database. Worst-case disclosure
path is: (a) a user's own browser memory, (b) the HTTPS response logged
by a hostile proxy, (c) Supabase logs for the RSC response. Of these,
(c) is the most plausible and is mitigated by Supabase log retention
being short; a future audit can also redact the field server-side before
returning if it becomes necessary.

## OAuth token handling (Ticket #3)

- Google OAuth tokens are managed by Supabase Auth; we never touch the
  refresh token directly.
- Access token goes in `session.provider_token` on the server; client
  gets only a signed session cookie.
- OAuth scopes include `gmail.settings.sharing` and `gmail.send` — not
  used by any code yet but pre-approved for the Chrome Extension (v2
  backlog). If that work is cancelled, drop the scopes in a follow-up
  PR to reduce consent-screen friction.

## Cloudflare token handling (Ticket #4a)

- User pastes their own zone-scoped token once per setup run; we keep
  it in memory for the duration of the server action and never persist.
- If the setup run fails mid-flight, the resume flow
  (`resumeDestinationVerify`) requires the user to paste the token
  again. We do not store or encrypt-at-rest; the token is short-lived
  to the request handler.
- Scope enforcement is on the user (creating the token) — see
  `setup.step1.tokenHelp` in `messages/{en,ru}.json` for the minimal
  scope list.
