# MailKit Dogfood Pre-flight — Prep & Results

## Supabase test user

| Field | Value |
|---|---|
| email | dogfood-test@mailkit.local |
| user_id | cb037275-8d48-47f1-a2a4-ba1a5cc9e191 |
| purchase_id | efb76e9f-921f-4500-a020-49ddf5fa1209 |
| ls_order_id | dogfood-f6c663c8-25c3-46fd-add0-6865eca85b8c |
| domain | dogfood.getmailkit.com |

## Backend smoke test — 2026-05-09

Ran `scripts/dogfood-smoke.mjs` against production Postmark + Cloudflare getmailkit.com zone.

| Phase | Result | Timing |
|---|---|---|
| Zone check (getmailkit.com) | ✅ | 642ms |
| PM createServer | ✅ id=19179123 | 893ms |
| PM addSenderDomain | ✅ id=5029551 | 313ms |
| CF DNS write (DKIM TXT + Return-Path CNAME + SPF TXT) | ✅ | 1457ms |
| verifyDkim | ✅ VERIFIED | 60s (2 polls) |
| send email (smoke@dogfood-smoke.getmailkit.com → bkomarov85@gmail.com) | ✅ Inbox, not spam | 284ms |
| CF cleanup (3 records deleted) | ✅ | — |
| PM domain deleted | ✅ | — |
| PM servers | suspended (delete API blocked — manual cleanup in Postmark UI) | — |

**Email delivery confirmation:** "MailKit smoke" landed in Gmail Inbox (not spam).
**DKIM confirmation:** Postmark sent "We've verified DKIM updates for dogfood-smoke.getmailkit.com" — 1024-bit long DKIM signing active.

### Notes
- CF zone ID for getmailkit.com: `91a0f674ae3bf26d883a63524db7dc5a`
- Zone ID `0151d481c677bc877c7e9b1eee1aa110` = `mailkit-test.ru` (different zone)
- Postmark account token: encrypted Vercel secret, not in repo. Retrieve from Postmark dashboard.
- PM server delete via API returns 403 — use Postmark UI to delete smoke servers.
- DKIM key uses `DKIMPendingHost` field on newly created domains (not `DKIMHost`).

## UI audit (mock states) — 2026-05-09

Audited all 8 wizard mock states via Playwright. No user-visible bugs found.

| State | Result |
|---|---|
| token_entry | ✅ |
| zone_selection | ✅ |
| smtp_dns_written | ✅ |
| smtp_dkim_polling | ✅ |
| smtp_dkim_polling_long | ✅ |
| gmail_smtp_ready | ✅ |
| gmail_done | ✅ |
| failed | ✅ |

"undefined" strings visible in page source appear only inside `<script>` RSC payload tags
(`self.__next_f.push`). They are Next.js internal serialization — not rendered in the DOM.
Verified by inspecting rendered DOM: no "undefined" text visible to users.

Mobile 390px: no horizontal overflow on any state.
