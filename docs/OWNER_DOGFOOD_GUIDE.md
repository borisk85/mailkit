# MailKit — Owner Dogfood Guide

Checklist for Boris to validate the full customer flow end-to-end using
Postmark Free plan (100 emails/month). Run this before enabling Platform
$18/mo and opening the FIRST100 launch promo.

---

## Prerequisites

- Postmark account approved (done)
- `feat/postmark-backend` merged into main (done)
- Vercel production deploy up to date
- A real domain you control on Cloudflare DNS (not getmailkit.com — use
  a second domain or a subdomain zone you own)
- A working Gmail account to configure Send-As on

---

## Step 1 — Buy/use a test domain

Use any domain you own on Cloudflare DNS. If you don't have a spare one,
register a cheap `.xyz` or `.dev` domain (~$1-2/year) at Namecheap or
Cloudflare Registrar and point its nameservers to Cloudflare.

Confirm: domain appears in Cloudflare → DNS → your zone.

---

## Step 2 — Generate a Cloudflare API token

In Cloudflare dashboard → My Profile → API Tokens → Create Token.

Use template **Edit zone DNS** → select your test domain.

Copy the token — you will paste it into the MailKit wizard.

---

## Step 3 — Start the setup flow

1. Open `https://getmailkit.com/en` (production)
2. Click "Get your email" CTA
3. Sign in with Google
4. You should land on `/app/setup`

If you already have a purchase: go to `/app/setup` directly.
If not: complete a $5 purchase with a real card (refund immediately after).

---

## Step 4 — Enter setup details

In the wizard:

| Field | What to enter |
|---|---|
| Domain | Your test domain (e.g. `testdomain.xyz`) |
| Mailbox | Any local part (e.g. `hello`) |
| Cloudflare API token | The token from Step 2 |

Click Continue.

**Expected:** Cloudflare Email Routing step runs automatically. Takes ~15s.
Watch for green checkmarks on "Email Routing enabled", "MX records", "DNS records".

---

## Step 5 — Postmark SMTP setup

After Cloudflare phase completes, the wizard starts the Postmark SMTP phase.

**Expected sequence:**
1. "Creating your email server…" — Postmark Server created via Account API
2. "Authenticating your domain…" — DKIM + SPF records written to Cloudflare
3. "Verifying domain with Postmark…" — polling DKIM verification status

**Typical wait:** 2-15 minutes.

While waiting, check:
- In Cloudflare DNS zone → confirm 3 DKIM CNAME records appeared
- In Postmark dashboard → Servers → your domain → Domains → status

---

## Step 6 — DKIM verified

When Postmark verifies the domain, wizard should advance automatically.

**Expected:** UI transitions to Gmail Send-As wizard.

If it takes more than 30 minutes: check Cloudflare for proxy status on DKIM
records (must be DNS-only, not proxied). Check Postmark domain status for
any error message.

---

## Step 7 — Gmail Send-As wizard

Follow the 6-step wizard exactly as a customer would:

1. Open Gmail Settings → Accounts and Import → Send mail as → Add another email
2. Enter your name + `hello@testdomain.xyz`
3. SMTP Server: `smtp.postmarkapp.com`, Port: `587`
4. Username AND Password: the server token shown in the wizard (copy-paste)
5. Click Add Account → verification email arrives in your Gmail inbox
6. Click the confirmation link in that email
7. Return to MailKit wizard → click "I've verified"

**Expected:** Setup completes, dashboard shows the setup as "Done".

---

## Step 8 — Send a test email

In Gmail, compose a new email:
- Change "From" to `hello@testdomain.xyz` (the new Send-As address)
- Send to your personal email

**Expected:** Email arrives in your inbox, From shows `hello@testdomain.xyz`.

Check Gmail Sent — email shows as sent from the custom domain.

---

## Step 9 — Check Postmark dashboard

In Postmark → Servers → (your domain server) → Activity:

- You should see 1 outbound email logged
- Delivery status: Delivered

---

## Step 10 — Verify sending limits widget

Go back to MailKit dashboard (`/app`).

**Expected:**
- Setup card shows "Done"
- Sending limits widget appears above the card showing today's usage
- Today: 1/500, This hour: 1/50, This minute: 0/5

---

## Edge cases to test

| Scenario | How to test |
|---|---|
| Invalid CF token | Enter a wrong token → confirm error message shown, not a crash |
| Already-configured domain | Re-run setup on same domain → confirm it handles gracefully |
| Page refresh mid-setup | Refresh browser during Postmark polling → confirm setup resumes |
| Mobile viewport | Test on phone or DevTools mobile emulation → check wizard steps fit |

---

## Post-dogfood actions

After verifying all steps work cleanly:

1. **Fix any bugs found** — open issues in conversation, fix before launch
2. **Upgrade Postmark** to Platform $18/mo (Settings → Billing)
3. **Create FIRST100 discount** in Lemon Squeezy (100% off, 25 uses)
4. **Open launch promo** — the announcement banner is already live
5. **Configure Postmark webhook** in dashboard (if not done yet):
   - Servers → MailKit Transactional → Webhooks → Add
   - URL: `https://getmailkit.com/api/webhooks/postmark`
   - Header: `X-Postmark-Webhook-Token` = value from Vercel env `POSTMARK_WEBHOOK_TOKEN`

---

## Known free plan limits during dogfood

- 100 test emails/month on Postmark Free
- Up to 10 servers total (2 used: My First Server + MailKit Transactional)
- Dogfood uses 1 server slot — leaves 7 for launch customers before needing Platform plan

Upgrade to Platform $18/mo before opening registrations so you have unlimited servers.
