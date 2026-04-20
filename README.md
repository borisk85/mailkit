# MailKit

**Email on your domain in 5 minutes, guaranteed.** Skip 30 minutes of DNS hell.

MailKit is a hybrid-MVP SaaS that automates **Cloudflare Email Routing** and
**Brevo SMTP** setup for a user's domain, then guides them through the final
Gmail Send-As step via a 3-minute copy-paste wizard. Target: indie hackers and
solopreneurs with personal Gmail who want `hello@mydomain.com` working in their
existing inbox — without 30 minutes of manual DNS / SMTP / Gmail Settings
fiddling.

**Status:** scaffold in progress (Ticket #2). Product brief:
[docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md). Spike findings (why Gmail step
stays manual in MVP): [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md).

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript strict
- **UI:** Tailwind 4 + shadcn/ui
- **i18n:** next-intl (EN default, RU secondary)
- **DB + Auth:** Supabase (RLS enabled)
- **Integrations:** Cloudflare API (user-connected), Brevo API (shared account), Gmail API (user-connected OAuth)
- **Payments:** Lemon Squeezy (Stripe unavailable in KZ)
- **Hosting:** Vercel

Python spike code that proved the API chain is kept in
[`/reference/spike/`](reference/spike/) as a reference — it is being ported to
TypeScript in `/lib/integrations/` in Ticket #3.

## Run locally

### Prerequisites
- Node.js 20+
- pnpm 10+
- Supabase project (URL + anon key + service role key)

### Install

```bash
pnpm install
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
```

Apply the DB migration in Supabase SQL Editor:

```bash
cat supabase/migrations/0001_init.sql
```

### Dev

```bash
pnpm dev
```

Open [http://localhost:3000/en](http://localhost:3000/en) or
[http://localhost:3000/ru](http://localhost:3000/ru).

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Next dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript check without emit |
| `pnpm format` | Prettier write |

A Husky pre-commit hook runs `lint-staged` with `lint` + `typecheck`.

## Repo structure

```
/app
  /[locale]            — locale-prefixed routes (next-intl middleware)
    /page.tsx          — landing with hero + waitlist
    /app               — future authed area
/components
  /ui                  — shadcn primitives
  /landing             — hero, features, pricing, waitlist form
/lib
  /supabase            — createClient helpers (server / browser)
  /integrations        — Cloudflare / Brevo / Gmail wrappers (Ticket #3)
/messages
  /en.json             — English strings
  /ru.json             — Russian strings (mirror)
/supabase
  /migrations          — SQL
/docs
  /PRODUCT_BRIEF.md    — current product brief
  /SPIKE_FINDINGS.md   — Python-spike findings (the Gmail blocker)
  /archive             — historical docs
/reference
  /spike               — original Python spike (reference only)
```

## Deployment

Vercel auto-deploys `main`. Env vars required in Vercel project settings —
same list as `.env.example`. Domain: `getmailkit.com`.

## Links

- Product brief: [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
- Spike findings: [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md)
- Claude memory: [CLAUDE.md](CLAUDE.md)
