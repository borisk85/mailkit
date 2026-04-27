# MailKit — Launch Checklist

> Single document Boris runs through end-to-end on launch eve. Every
> step is owner-side: dashboards, env vars, DNS, single-click smoke.
> Engineering work is already in main — this is the configuration
> tail.
>
> Order matters: each section depends on the one above. Skim once
> before starting, then run top-to-bottom.

## Pre-flight (30-60 minutes the day before)

### 1. Vercel Pro (already done 2026-04-26)
- [x] Plan: Pro
- [x] Cron quotas: `*/10 * * * *` and hourly schedules accepted

### 2. Sentry (#45)
- [ ] Project created at sentry.io (free tier, 5K errors/month)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set on Vercel **Production**
- [ ] `SENTRY_DSN` set on Vercel **Production** (same value as above is fine)
- [ ] Optional: `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT` for source-map upload at build time

### 3. AWS SES (#26 dependency, optional pre-launch)
- [ ] Production access approved (3-5 days lead time)
- [ ] `AWS_SES_ACCESS_KEY_ID` / `AWS_SES_SECRET_ACCESS_KEY` / `AWS_SES_REGION` ready

If AWS approval is still pending on launch eve: launch with Brevo only. Migration runbook (#27) flips outbound to SES if Brevo freezes after launch — not urgent.

## Launch eve (~30-45 min from start to live, sequence below)

### 4. Lemon Squeezy live-mode setup (#34)

**Switch LS dashboard to Live mode.** Top-bar toggle.

**Create live-mode webhook:**
- LS Settings → Webhooks → "+ Add endpoint"
- URL: `https://mailkit-ten.vercel.app/api/webhooks/lemon-squeezy` (until DNS cutover, then `https://getmailkit.com/...`)
- Events: `order_created` + `order_refunded`
- Signing secret: generate any 32+ byte hex; copy it for the next step

**Create live-mode API key:**
- LS Settings → API → "Create API key"
- Copy the value once — LS doesn't show it again

**Create the FIRST100 discount code (#33):**
- LS dashboard (Live mode) → Discounts → New
- Code: `FIRST100`
- Type: 100% off
- Max redemptions: 100
- Apply to: MailKit Email Setup product
- Save

**Update Vercel Production env vars** (Settings → Env Variables, Production scope):
- `LEMONSQUEEZY_API_KEY` → live-mode key
- `LEMONSQUEEZY_WEBHOOK_SECRET` → secret from the webhook above
- `LEMONSQUEEZY_CHECKOUT_URL` → `https://velabot.lemonsqueezy.com/checkout/buy/<live-product-uuid>` (the live MailKit product, not the test one `95511540-...`)

**Add post-payment redirect on the live product:**
- LS → Products → MailKit Email Setup (Live) → Settings → "Redirect after payment URL"
- Value: `https://mailkit-ten.vercel.app/en/app/setup?paid=1&order_id={order.identifier}`
- After DNS cutover (step 6 below) update to `https://getmailkit.com/...`

### 5. Trigger Vercel redeploy
Production deploys are automatic on `main` push, but the new env vars only attach to a fresh build. Either:
- Push a trivial commit to `main`, or
- Vercel dashboard → latest Production deploy → "Redeploy"

### 6. Domain binding — getmailkit.com → Vercel (#35)

**Vercel:**
- Project mailkit → Settings → Domains → Add `getmailkit.com` (and `www.getmailkit.com`)
- Vercel shows two records to add at the registrar

**Registrar (Namecheap or wherever the domain lives):**
- Add the records Vercel showed: usually one A record for apex, one CNAME for `www`
- Save

**Wait for SSL** — Vercel auto-issues a Let's Encrypt cert; takes 1-15 min after DNS resolves.

**Switch site URL env vars after the domain works:**
- `NEXT_PUBLIC_SITE_URL=https://getmailkit.com` (Production)
- Update LS post-payment redirect URL on the live product to use `getmailkit.com`
- Trigger another Production redeploy so `sitemap.xml` and `robots.txt` regenerate with the apex.

### 7. Supabase auth allow-list
Add `https://getmailkit.com/**` to the URI allow-list (Supabase dashboard → Authentication → URL Configuration). Without this, OAuth callback after sign-in via getmailkit.com gets dropped.

The wildcard pattern is already broad enough today (`https://*-bkomarov85-2187s-projects.vercel.app/**`); the explicit getmailkit.com entry future-proofs against URL-pattern tightening.

### 8. Smoke test — single live purchase ($5)

Real card, real money, full happy path. Refund yourself immediately (loses ~$0.50 LS fee, acceptable for confidence).

- Open `https://getmailkit.com/en` (or mailkit-ten.vercel.app if cutover not yet)
- Click "Get your email — \$5" in the hero
- Pay with your real card (NOT 4242, that's test mode only)
- Watch for: LS checkout → "Thanks for your order" → redirect to `/en/app/setup?paid=1&order_id=...`
- Sign in with Google when prompted
- Dashboard shows the purchase under "Purchases" → `status: paid`
- Vercel Logs (live) show `[ls-webhook] order_created` succeeded
- Supabase: `select * from purchases order by created_at desc limit 1` confirms row
- LS dashboard → Orders → Refund the order → confirm
- Vercel Logs show `[ls-webhook] order_refunded` succeeded
- Dashboard reload: purchase status flips to `refunded`, refund row visible under "Refund history"

If anything in this sequence fails — abort launch, debug, retry. The sandbox flow already passed (#7 etap 1 sandbox evidence in `docs/SPIKE_FINDINGS.md`-ish notes); a live-mode break here is environmental (env var typo, webhook URL mismatch) not a code bug.

### 9. Google OAuth verification (#36)
- Submit per `docs/TICKET_36_OAUTH_SUBMISSION.md` (separate handoff, will live in repo until verified)
- Soft launch is OK with the unverified-app warning screen — full verified status comes 4-8 weeks post-submission
- Don't block launch on this; submit it the day landing goes live so the clock starts immediately

## Post-launch (within 24-72 hours)

### 10. Marketing distribution
- Show HN post
- Indie Hackers launch post
- Reddit: r/SaaS, r/indiehackers, r/smallbusiness
- ProductHunt prep (the actual PH launch ideally happens 1-2 weeks later when initial signal is in)
- Telegram channel + X bio update — both Boris-side, no engineering ask

### 11. Monitor live signals
- Sentry → check for any unfiltered prod errors (false-positive catch)
- Vercel cron logs at the next 10-min tick: `/api/cron/sync-send-counters` and hourly `/api/cron/sync-deliverability` should both return 200 with empty outcomes (no live customers yet)
- Supabase: watch `purchases`, `setup_runs`, `webhook_events` for the first real customer's data trail

### 12. Tear down launch artifacts
Once verified by Google + first 10 customers landed cleanly:
- [ ] Delete `docs/TICKET_36_OAUTH_SUBMISSION.md` (handoff served its purpose)
- [ ] Delete `docs/LAUNCH_CHECKLIST.md` (this file) — keep the project clean post-launch
- [ ] Bump `mailkit.announcement.v2` storage key when retiring or rotating the FIRST100 banner

## What's already done (for context)

All engineering tickets are in `main` as of this checklist's date:
- Foundation: #2 scaffold, #3 OAuth, #4 CF + Brevo + Gmail wizard, #5 onboarding shell, #6 Send-As wizard
- Payments: #7 Lemon Squeezy etap 1 (webhook + auto-refund + thank-you linking)
- Anti-abuse: #21 send limits, #22 deliverability monitoring (cron live)
- Legal: #23 /terms, #32 /privacy, #24 deliverability disclaimer
- Dashboard: #37 + #51 /app dashboard with sections, account delete, e2e
- Landing: #11 etap 1+2+3 + #59 (19-question FAQ)
- AI search: #56 llms.txt, #58 robots.txt + sitemap.xml, #57 JSON-LD
- Ops: #39 cookie consent, #41 error boundary, #45 Sentry
- UI: #38 brand lockup unification + cross-page anchor nav
- OAuth verification prep: #36 narrow scopes + submission handoff
- Promo: #33 first-100 discount on landing CTAs

Outstanding (post-launch, AWS-pending):
- #26 SMTP-adapter abstraction (after AWS SES production access)
- #27 incident migration runbook (after #26)
- #28 secondary notification channel (after #26)
- Various improvements on the post-validation track per `docs/TICKETS_BACKLOG.md`
