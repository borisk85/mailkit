# MailKit — Tickets Backlog

> Single source of truth для всех tasks/tech debt/ideas. Issues на
> GitHub не создаем (см. CLAUDE.md "Issues policy").

## ✅ Completed
- #1 Feasibility Spike

## 🔨 MVP v1 (build now, 3-4 weeks total)
- #2 Production scaffold (done)
- #3 Auth + Google OAuth flow (done, PR #8)
- #4 Setup pipeline backend (Cloudflare + Brevo in TS)
  - #4a Cloudflare pipeline (done, merged PR #10)
  - #4b Brevo SMTP integration
    - **Pre-requisites (MUST fix before Brevo API calls):**
      - **SPF merge policy**: если `@ TXT v=spf1` уже существует — merge
        (добавить `include:<brevo>` сохранив existing includes), не
        overwrite. Нужен parser для SPF mechanism list
        (`include:`, `ip4:`, `ip6:`, `a:`, `mx:`, `~all`/`-all`/`+all`).
      - **Content-pattern upsert**: match TXT records по content prefix
        (`v=spf1` / `v=DMARC1` / `brevo-code:` /
        `google-site-verification:`), не first-match по позиции. В
        `listDnsRecords` добавить фильтр + pattern-match helper.
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
- Auto-verification Gmail Send-As via Brevo SMTP test-send + inbox poll.
  Trigger: первая жалоба пользователя «настроил, но не отправляет», либо
  при наборе >100 paying users — тогда оправдана оптимизация funnel
  completion rate. В MVP (#6) принимаем user-asserted confirmation
  (checkbox + server action), verification на честное слово. Техническая
  развилка при реализации: `nodemailer` dep + через Brevo SMTP послать
  тестовое письмо на `target_email`, ждать receipt в Gmail inbox через
  `gmail.readonly` scope + polling. Обе side-effect'а — новые зависимости,
  доп. OAuth consent-screen trust ("зачем им читать мою почту?"). Если
  landing этого фичера снизит conversion — откатывать.
- Brevo SMTP shared-credential abuse mitigations (см. [docs/SECURITY.md](SECURITY.md)):
  rate limit per `setup_run` через `/v3/smtp/statistics/events` polling
  + UI block on breach; SMTP key rotation UX (re-paste banner когда
  `BREVO_SMTP_KEY_VERSION` в env > `gmail_state.smtp_config_version` в
  run). Оба — post-launch, триггер "первая abuse incident либо плановая
  90-day rotation".
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
  - Attempt 2 scope **также включает `/app/setup`** — authenticated route, single-run preview Perf EN 78 / RU 70 по замеру в PR #10. Чинится той же работой по framework chunk split / polyfills, не отдельный PR.
  - **Post-#4a-merge regression на landing** (2026-04-21, prod commit 626ed14): median 3×3 прогонов — EN 76→71 (warm), RU 63→55 (warm), TBT RU взлетел до 1008ms (было 70ms). Кандидат: `lucide-react` icons (AlertCircle, CheckCircle2, Loader2) из wizard + `zod` от setup-actions попали в shared chunk landing'а через code-split. Attempt 2 должен замерить bundle-analyzer diff pre/post-#4a и либо изолировать app/setup icons через `dynamic()`, либо tree-shake lucide по named imports.
  - **Post-#4b check** (2026-04-23, merge 18b6d42 + ~13h warm, n=5/locale median, methodology в [POST_MERGE_SOP.md](investigation-2026-04-22/POST_MERGE_SOP.md)): EN 75 (vs post-#4a 77, delta −2 = noise), RU 85 (vs post-#4a 74, delta +11 = improvement). #4b не добавил регрессии; previewный "RU −12" сигнал был lambda cold-start variance, не код. Investigation closed. Systemic perf work renames → **attempt-3** scope: `NextIntlClientProvider` `pick(messages,...)`, selective `export const dynamic="force-dynamic"` на `/app/*`, bundle-analyzer через `pnpm next experimental-analyze`, font-strategy review. Открывать как `chore/perf-systemic-attempt-3` отдельным PR (не бандлить с feature).
  - Tracked on GitHub Issue #7 (legacy — новые подобные сюда, не в Issues)
- Prettier drift на scaffold/shadcn файлах (30 шт), фиксить отдельным
  chore-PR без функциональных правок. Фиксируется одним запуском
  `pnpm format`; ревью сжимается до diff-а (generated-only).
