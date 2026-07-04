# MailKit

> **Status: shelved — post-mortem below.** Built solo as a pre-launch micro-SaaS, then killed on evidence before public launch and kept as a portfolio piece. The honest "why it didn't work" is [further down](#why-it-was-shelved-post-mortem) and is the most useful part of this repo.

Automated setup of professional email on your own domain — **Cloudflare Email Routing + Postmark SMTP + Gmail Send-As** — as a **one-time $5** purchase instead of a monthly subscription.

Target user: a non-technical person who already has a domain on Cloudflare DNS and wants `hello@theirdomain.com` sending and receiving inside the Gmail inbox they already use, without an hour of manual DNS / SMTP / Gmail configuration.

---

## What it does

A guided wizard takes the user from "I have a domain on Cloudflare" to "I can send and receive from my domain in Gmail":

1. **Paste a scoped Cloudflare API token** — the only manual technical step on the user's side.
2. **Pick the mailbox** (`hello@domain`).
3. **Automation runs server-side:** enables Cloudflare Email Routing, provisions a Postmark sender, and writes the MX / SPF / DKIM / DMARC records via the Cloudflare API.
4. **Payment happens mid-wizard**, then DKIM verification is polled in the background (~5–30 min for DNS propagation).
5. **Gmail Send-As** — a copy-paste guided step (the Gmail `sendAs.create` API is blocked on personal `@gmail.com` accounts, so this stays a short manual walkthrough by design — see [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md)).

Around that core flow the project also implements a dashboard, Lemon Squeezy checkout with a first-purchase coupon, transactional email, an anti-abuse / auto-refund pipeline, Telegram owner alerts, a support chatbot knowledge base, full legal docs, and an SEO surface (`/compare`, `/about`, `/glossary`, `llms.txt`, JSON-LD).

---

## Tech stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict)
- **UI:** Tailwind CSS 4 + shadcn/ui + lucide-react
- **Auth + DB:** Supabase (Postgres, Row-Level Security)
- **Email infra:** Cloudflare Email Routing (receiving, on the user's own account) + Postmark (SMTP relay, shared) + Gmail Send-As
- **Payments:** Lemon Squeezy (Merchant of Record — Stripe is unavailable in KZ)
- **Monitoring:** Sentry, Vercel Analytics, Better Stack status page
- **Tests:** Vitest + Playwright
- **Hosting:** Vercel, domain `getmailkit.com`

---

## Why it was shelved (post-mortem)

The product was killed **before launch, on evidence**, not on sunk cost. Three findings, in the order they landed:

**1. The direct competitor was validated too late.**
A late competitive re-check surfaced **SendMailAs** — which does the same job with a **free tier** (1 domain, 2 addresses, ~50 emails/day) and works on **any DNS host** (records you paste yourself, self-hosted relay). MailKit required the domain to be **on Cloudflare** and to create an **API token**, and charged **$5**. Head-to-head for the core user, MailKit lost on:
- **Price** — $0 (their free tier) vs $5 for the base 1-domain case.
- **Reach** — any DNS host vs Cloudflare-only (~15–20% of sites).
- **Setup simplicity** — paste a few records vs create a scoped API token + be on Cloudflare.

The one real edge left (sending through Postmark, a managed relay, vs their self-hosted one) mattered mostly to high-volume / cold senders — who cannot use a Gmail-Send-As product anyway, and whom Postmark's terms explicitly prohibit.

**2. No search demand for the differentiated angles.**
Measured in Google Keyword Planner. The commercial long-tail that actually fit MailKit's differentiators — *one-time*, *no subscription*, *without Google Workspace*, *multiple domains* — all came in at **~10–100 searches/month**. The high-volume head terms are locked by Google's own help docs, Zapier, and incumbents. There was **no viable, winnable SEO acquisition channel**.

**3. The unit economics were underwater.**
At a realistic **1–3 sales/month × $5 = $5–15/mo**, revenue sits **below Postmark's $18/mo** paid tier that a live product needs — cash-negative before counting a single hour of time. Paid ads cannot rescue a $5 product when CAC on these terms exceeds the price.

**Decision: shelved.** With no cheap acquisition channel and no product edge over a free, more-flexible competitor, the numbers said stop.

---

## Lessons (the reason this README exists)

1. **Validate the direct competitor's *full* pricing — including any free tier — in week one, before writing code.** The competitor's free tier was the single fact that invalidated the entire price positioning, and it was checkable in an afternoon. It was checked in month two.
2. **Measure real search demand (GKP) for your *actual* differentiators before committing months** — not after building the product around them.
3. **A one-time, low-price product needs either huge volume or near-zero CAC.** Neither existed here, and that was knowable up front.

---

## Run locally

```bash
pnpm install
cp .env.example .env.local
# fill Supabase URL + anon key + service role key, and provider keys
pnpm dev            # http://localhost:3000
```

| Command | What it does |
|---|---|
| `pnpm dev` | Next dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Vitest |
| `pnpm lint` | ESLint |

Requires Node.js 20+ and pnpm 10+. A Husky pre-commit hook runs Prettier + ESLint + typecheck on staged files.

---

## Docs

- [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md) — product scope
- [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md) — why the Gmail step stays manual
- [docs/COMPETITORS.md](docs/COMPETITORS.md) — competitor analysis (incl. the SendMailAs re-assessment)
- [docs/SEO_KEYWORDS_SERP.md](docs/SEO_KEYWORDS_SERP.md) — the keyword / SERP check that closed the SEO channel

_Built solo with Next.js and Claude Code, 2026._
