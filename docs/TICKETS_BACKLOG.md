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
  - Current после PR #9 (preview): EN Perf 83 (+10), RU 81 (noise).
    LCP EN 3.2s, RU 3.3s. FCP EN 3.2s, RU 3.3s. TBT EN 180ms ✓ (target
    <200ms взят на EN), RU 250ms ❌.
  - Remaining gap (hypotheses, by expected impact):
    1. **LCP candidate = hero H1 `font-display: swap` + network** —
       после PR #9 fonts self-hosted + preloaded, но H1 рендерится после
       font swap. Try: render H1 c `font-display: block` для критичного
       hero шрифта, остальные — `swap`. Или inline CSS с `size-adjust`
       fallback чтобы layout stable до Geist загрузки.
    2. **Polyfills chunk 113 KB** — `03~yq9q893hmn.js` в
       `polyfillFiles`. С .browserslistrc модерн-таргетом Turbopack все
       равно эмитит fallback polyfill. Ожидалось снижение, не произошло.
       Нужно либо убедиться что Turbopack читает .browserslistrc для
       transpile target (env `NEXT_TELEMETRY_DEBUG=1` может показать),
       либо `experimental.browsersListForSwc` / отдельный target hint.
    3. **Root 228 KB chunk** — `00ymx19_r9hnz.js` на каждой странице.
       Подозреваю tw-animate-css + sonner + lucide, часть не нужна на
       landing. Решается `dynamic()` для Toaster и Sign-in-button
       (mount после interaction).
    4. **TBT RU 250ms** — hydration landing. Landing не нуждается в
       client Waitlist form до скролла к CTA; rule: оборачивать
       client-only секции в Suspense + defer.
  - Scope на следующий перф-PR: (1), (2), (3). (4) отложить до
    measurement-after-(1..3).
  - Follow-up attempt 2: LCP/FCP — framework split + hero critical inline CSS + image priority (after Ticket #4a merged)
  - Tracked on GitHub Issue #7 (legacy — новые подобные сюда, не в Issues)
- Prettier drift на scaffold/shadcn файлах (30 шт), фиксить отдельным
  chore-PR без функциональных правок. Фиксируется одним запуском
  `pnpm format`; ревью сжимается до diff-а (generated-only).
