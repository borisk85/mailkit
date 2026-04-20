# MailKit — Tickets Backlog

> Single source of truth для всех tasks/tech debt/ideas. Issues на
> GitHub не создаем (см. CLAUDE.md "Issues policy").

## ✅ Completed
- #1 Feasibility Spike

## 🔨 MVP v1 (build now, 3-4 weeks total)
- #2 Production scaffold (in progress)
- #3 Auth + Google OAuth flow
- #4 Setup pipeline backend (Cloudflare + Brevo in TS)
- #5 Onboarding UI wizard
- #6 Gmail Send-As guided step UI
- #7 Lemon Squeezy payment ($5 single SKU)
- #11 Landing copy polish + demo video

## 🚫 Post-validation (do NOT build until ≥100 paying users or explicit architect approval)
- #8 Self-serve diagnostics & re-setup flow
- #9 Deliverability monitoring subscription
- #10 3-mailbox bundle SKU ($12)
- #12 Chrome Extension for Gmail step
- #13 Workspace-only automation (Phase B)
- #14 White-label for agencies
- #15 Multi-domain dashboard

## 🧹 Tech debt
- [GH #6](https://github.com/borisk85/mailkit/issues/6) Tighten waitlist insert via anon key + RLS INSERT policy (switch off service_role for public form)
- Проверить Vercel Framework Preset = Next.js при каждом мажорном
  merge в main (автоматизировать через GitHub Action в будущем)
- Landing performance optimization on live
  - Goal: Performance ≥90, LCP <2.5s, FCP <1.8s, TBT <200ms на EN/RU
  - Current: EN Perf 74, LCP 3.8s, FCP 3.6s, TBT 320ms
  - Scope: Next.js 16 minification, legacy-JS target, bundle analysis,
    font preload
  - Tracked on GitHub Issue #7 (legacy — новые подобные сюда, не в Issues)
- Prettier drift на scaffold/shadcn файлах (30 шт), фиксить отдельным
  chore-PR без функциональных правок. Фиксируется одним запуском
  `pnpm format`; ревью сжимается до diff-а (generated-only).
