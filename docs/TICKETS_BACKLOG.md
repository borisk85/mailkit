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
  - **Включить в scope #7 (обязательно до launch):**
    - Webhook handler для `order.paid` / `order.refunded` events от Lemon
      Squeezy → обновление `purchases` table + `refunds` audit log.
    - Auto-refund trigger при `setup_runs.status → failed` где
      `failed_step ∈ {cf_*, brevo_*}` → вызов Lemon Squeezy `POST /refunds`
      API + email уведомление юзеру. Если `failed_step` = `gmail_*` —
      user-side issue, refund только через 30-day canal (не auto).
    - `refunds` table в Supabase (см. migration в #16 ниже) + RLS.
    - Full guarantee policy в [docs/GUARANTEE_POLICY.md](GUARANTEE_POLICY.md).
- #11 Landing copy polish + demo video
  - **Включить в scope #11:**
    - Обновить tagline/hero с новой guarantee формулировкой (option A —
      `Guaranteed*` с fine-print ссылкой на `/guarantee`) по текстам из
      [docs/GUARANTEE_POLICY.md](GUARANTEE_POLICY.md) → "Customer-facing
      wording" → "Landing hero" + "Trust block".
    - FAQ секция добавить Q&A про guarantee — EN + RU копии из policy doc.
    - **Real Gmail UI screenshots** для 6-шагов wizard'а (заменяют SVG
      mini-diagrams). EN + RU Gmail интерфейсы (есть различия). Placement:
      `/public/screenshots/gmail-step-{1..6}.{en,ru}.webp`. Critical для
      SMB / non-tech audience segment — они запутываются в text-only
      инструкциях. Варианты получения: (a) Playwright automated capture
      на реальном Gmail test-аккаунте, (b) вручную захватить + оптимизовать
      через `sharp`. Оценка: (a) 2-3 часа работы dev, (b) 1-2 часа owner.
      Рекомендую (a) если Playwright справится с OAuth + Gmail UI state,
      иначе (b). В #6 UI сейчас schematic diagrams — они out-of-scope-style
      как placeholder, заменяются real screenshots в #11.

## 📄 Guarantee infrastructure (MUST fix before launch)
- #16 `refunds` table migration + RLS
  - Columns: `id uuid pk`, `run_id fk setup_runs`, `purchase_id fk purchases`,
    `amount numeric`, `currency text`, `reason enum(automation_failure,
    functional_30day_request, fraud_dispute, manual_support_discretion)`,
    `triggered_by enum(system, support, user_dispute)`, `lemon_squeezy_refund_id text`,
    `created_at timestamptz`, `notes text`.
  - RLS: SELECT only through service_role (audit-only table).
- #17 `/guarantee` static page
  - Route: `/[locale]/guarantee/page.tsx` server component, статическая
    страница с EN/RU текстом из
    [docs/GUARANTEE_POLICY.md](GUARANTEE_POLICY.md) → "Formal policy" →
    "EN (canonical)" для `/en/guarantee`, "RU (canonical перевод)" для
    `/ru/guarantee`. Без интерактивности, SSG. Linked из footer лендинга,
    из Trust block, из FAQ, из receipt email'а.
  - Acceptance: Lighthouse ≥95 Perf на обе локали (страница text-only,
    no-brainer).
- #18 Lemon Squeezy refund webhook + automation trigger
  - Входит в scope #7 (см. выше), выделяю отдельным тикетом для ясности
    блокера до launch.
  - Webhook endpoint `/api/webhooks/lemon-squeezy` — обработка
    `order.refunded` → log в `refunds` + email уведомление.
  - Internal trigger — cron / event listener на `setup_runs.status → failed`
    с `failed_step ∈ {cf_*, brevo_*}` → вызов Lemon Squeezy refund API →
    log + email. Idempotent (один refund на run, не дублировать).
- #19 ToS page + обновить existing footer links
  - Если ToS страница уже существует — обновить section "Refunds" текстом
    из `GUARANTEE_POLICY.md` → "Formal policy" → "EN (canonical)". Если нет
    — создать `/legal/terms` с полным ToS включая refund policy. Вне
    scope этого бэклога детально расписывать всю ToS (другие секции —
    privacy, liability, etc. — owner с юристом по-хорошему когда будет
    время / revenue).
- #20 Support email template для functional refund requests
  - Готовый шаблон в `docs/` (новая папка `docs/support-templates/`?) для
    support-оператора: как ответить на refund request, что проверить в
    Supabase (user_id → setup_runs → status = done, purchase_id),
    decision tree "помогать чинить vs refund сразу".

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
  - Attempt 2 scope **также включает `/app/setup`** — authenticated route, single-run preview Perf EN 78 / RU 70 по замеру в PR #10. Чинится той же работой по framework chunk split / polyfills, не отдельный PR.
  - **Post-#4a-merge regression на landing** (2026-04-21, prod commit 626ed14): median 3×3 прогонов — EN 76→71 (warm), RU 63→55 (warm), TBT RU взлетел до 1008ms (было 70ms). Кандидат: `lucide-react` icons (AlertCircle, CheckCircle2, Loader2) из wizard + `zod` от setup-actions попали в shared chunk landing'а через code-split. Attempt 2 должен замерить bundle-analyzer diff pre/post-#4a и либо изолировать app/setup icons через `dynamic()`, либо tree-shake lucide по named imports.
  - **Post-#4b check** (2026-04-23, merge 18b6d42 + ~13h warm, n=5/locale median, methodology в [POST_MERGE_SOP.md](investigation-2026-04-22/POST_MERGE_SOP.md)): EN 75 (vs post-#4a 77, delta −2 = noise), RU 85 (vs post-#4a 74, delta +11 = improvement). #4b не добавил регрессии; previewный "RU −12" сигнал был lambda cold-start variance, не код. Investigation closed. Systemic perf work renames → **attempt-3** scope: `NextIntlClientProvider` `pick(messages,...)`, selective `export const dynamic="force-dynamic"` на `/app/*`, bundle-analyzer через `pnpm next experimental-analyze`, font-strategy review. Открывать как `chore/perf-systemic-attempt-3` отдельным PR (не бандлить с feature).
  - Tracked on GitHub Issue #7 (legacy — новые подобные сюда, не в Issues)
- Prettier drift на scaffold/shadcn файлах (30 шт), фиксить отдельным
  chore-PR без функциональных правок. Фиксируется одним запуском
  `pnpm format`; ревью сжимается до diff-а (generated-only).
