# MailKit — CLAUDE.md

## Quick context
Hybrid MVP SaaS: automates Cloudflare Email Routing + Brevo SMTP setup on the
user's domain, then guides the user through the Gmail Send-As final step via a
3-minute copy-paste wizard. Target: **$5 per mailbox** setup for indie hackers
with personal Gmail accounts.

## Architecture constraints (важно)
- **Gmail `sendAs.create` blocked on personal @gmail** — the API method requires
  Workspace with domain-wide delegation. MVP accepts a **3-min guided manual
  step** as the final phase. See [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md)
  for the exact error, reproduction, and ruled-out workarounds.
- **Brevo — single shared corporate account.** All customer sender domains live
  under one Brevo account (owner's). User does NOT create/see Brevo. Apply
  abuse detection and rate limits on our side.
- **Resend removed.** Transactional emails (welcome, receipt, setup-done) also
  through Brevo transactional API.

## Stack
- Next.js 16 App Router + TypeScript strict
- Tailwind 4 + shadcn/ui
- next-intl (EN default, RU secondary — both first-class)
- Supabase (auth + DB, RLS enabled)
- Lemon Squeezy payments (Stripe unavailable in KZ)
- Hosted on Vercel, domain getmailkit.com

## Pricing
- Pay-per-setup: **$5** (1 mailbox), **$12** (3 mailboxes on one domain)
- Subscription: **$3/mo** deliverability monitoring per domain (optional)
- Aliases: free bundled with paid mailbox (unlimited via CF Email Routing)

## Honest positioning
- Tagline: "Email on your domain in 4 minutes, guaranteed."
- Metric when asked: "We automate 100% of the technical complexity. You do 3
  simple copy-paste actions."
- **Never** say: "0 clicks", "full auto", "90% automation", "zero setup" — it's
  a stretch and breaks trust on first run.
- Money-back guarantee if >5 minutes.

## Known constraints
- Gmail `sendAs.create` blocked on personal @gmail (requires Workspace DWD)
- Gmail step accepted as 3-min guided UX for MVP
- Chrome Extension planned for v2 to reduce Gmail step to ~20 sec (legal
  research + Chrome Store ToS review required BEFORE dev)
- Brevo ops: single shared account handles all customer sender domains
- Honest positioning: "4-5 min, guaranteed" — no "0 clicks" claims

## What NOT to do
- Don't build audit tool / DNS checker — out of scope for MVP
- Don't add freemium or trials — attracts spammers (domain abuse on shared Brevo)
- Don't add done-for-you services — doesn't scale
- Don't over-engineer — MVP first, optimize after traffic
- Don't touch Cloudflare/Brevo/Gmail code without reading
  [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md) first
- Don't re-introduce Resend — Brevo handles transactional too

## Communication style with owner
- На «ты», коротко, без маркдауна в простых ответах, без лекций
- НИКОГДА Е/ё — только Е/е (все, еще, свое, прошел)
- Деплой и push — сразу после правки, без вопросов
- Баги — сразу чинить, без «исправить?»
- Когда owner поправляет — короткое «ок»/«понял», не выдавать исправленную копию
- Запрещено слово «принял»

## Repo structure
```
/app/[locale]           — Next.js App Router с i18n
/components/{ui,landing,app}
/lib/{supabase,integrations}
/messages/{en,ru}.json  — next-intl strings
/supabase/migrations    — SQL
/docs                   — PRODUCT_BRIEF, SPIKE_FINDINGS, архив
/reference/spike        — код Python-спайка (справочник, не прод)
```

## Links
- Product brief: [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
- Spike findings: [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md)
- Repo: https://github.com/borisk85/mailkit
