# MailKit — Tickets Backlog

> Single source of truth для всех tasks/tech debt/ideas. Issues на
> GitHub не создаем (см. CLAUDE.md "Issues policy").

## ✅ Completed
- #1 Feasibility Spike

## 🚨 BLOCKING LAUNCH — Anti-abuse readiness (2026-04-29)

Ветка `feat/anti-abuse-launch-readiness`. Без этих 4 пунктов запуск
блокируется — иначе deliberate attack может убить AWS аккаунт за дни.

- **#ABUSE-1** Owner alerting на INSERT в `abuse_events`:
  - Sentry alert (low priority — для history)
  - Telegram bot **`@MailKitOwnerAlerts`** (создать заранее, токен в env vars) — push notification на phone owner'а в реальном времени
  - Содержание уведомления: domain клиента, event_type (rate_limit / bounce_threshold / complaint_threshold / phishing_pattern), observed values, direct link на abuse_events row в админке
  - Boris подтверждает что хочет именно Telegram, не SMS
- **#ABUSE-2** Postmark/AWS SES abuse desk response kit: скрипт `scripts/abuse-export.ts <domain>` → ZIP с send logs из CloudWatch, abuse_events, purchase + consent fields, ToS version. Готовый пакет для AWS abuse desk при инцидентах.
- **#ABUSE-3** Lightweight phishing pattern check на `prepareGmailStep`: blacklist suspicious mailbox names (`noreply`, `support`, `admin`, `paypal`, `apple`, `google`, `bank`, `secure`, `verify`) + domain typosquatting (Levenshtein < 2 от top brands). Match → `purchases.kyc_review_required = true` + alert через #ABUSE-1 канал. НЕ блокирует автоматически — только flags на manual review.
- **#ABUSE-4** Hard-suspend tenant в AWS SES: при `flagSuspended` → auto pause через SES API (delete email identity либо update sending status). Destructive trade-off, acceptable для abuse cases.

Существующая anti-abuse инфраструктура (готова, не трогаем):
- Per-domain rate limits (`lib/send-limits.ts`): 500/day, 50/hour, 5/minute
- Deliverability monitoring (`lib/deliverability.ts`): bounce + complaint thresholds + auto-pause
- Audit trail (`abuse_events` table в Supabase)
- Domain ownership verification через CF API при setup
- Per-customer attribution (`purchases.user_email`, `custom_data.domain`)

## 🎨 Dashboard polish (2026-04-30) — ветка `feat/dashboard-polish`

После просмотра скриншотов личного кабинета. Делается параллельно с `feat/smtp-dependency-disclosure` либо отдельной веткой. Не блокирует первый launch, но критично для professional UX.

- **#DASH-1 User-friendly error messages**
  - Заменить все технические dump'ы (`Error: 50000, Authenticate error`, `brevo missing_records`, `brevo duplicate_parameter`, `Error: state.suspended_by_owner: no`) на человеко-понятный текст с инструкциями что делать
  - Убрать упоминания `brevo` из всего user-facing UI (legal + privacy)
  - Убрать числовые error codes из видимости пользователя (логировать в Sentry, показывать только friendly text)
  - Mapping technical → user-friendly создать в `lib/error-messages.ts`

- **#DASH-2 Async flow status states**
  - Добавить промежуточные статусы между `pending` и `failed/active`:
    - "Configuring DNS" (первые 30 секунд автоматики)
    - "Waiting for AWS verification (typical 5-15 min, up to 30 min)"
    - "Ready for Gmail step" (DKIM verified, юзер должен зайти и закончить)
    - "Active" (после успешного test send)
  - Соответствующие visual indicators (icon, color) для каждого статуса
  - Прогресс-бар либо timeline компонент

- **#DASH-3 Failed setups cleanup**
  - Auto-archive failed карточек старше 7 дней (фоновый cron)
  - Manual delete кнопка на каждой failed карточке
  - Группировка "Previous failed attempts (N)" в свёрнутый блок если много

- **#DASH-4 Sending limits widget**
  - Мини-виджет на dashboard "You've sent X of 500 emails today"
  - Прогресс-бар с цветовыми зонами (зелёный <50%, жёлтый 50-80%, красный >80%)
  - Tooltip с разбивкой по minute/hour/day
  - Ссылка на FAQ "About limits"

- **#DASH-5 Delete account в Danger Zone**
  - Переместить "Delete my account" из Account section в отдельную Danger Zone секцию внизу страницы
  - Confirmation modal с вводом email для подтверждения
  - Visual styling: красная рамка, warning icon, текст "This action cannot be undone"

- **#DASH-6 Email support клик-действие**
  - "Email support" в Resources секции должен быть mailto:support@getmailkit.com либо триггерить открытие RAG bot widget когда он будет готов
  - Добавить иконку email рядом

- **#DASH-7 (опционально, post-launch) Basic metrics widget**
  - Total emails sent (за всё время и за последние 7/30 дней)
  - Bounce rate, complaint rate (за 30 дней)
  - Source: AWS CloudWatch metrics per tenant
  - Полезно для customer self-service диагностики deliverability

Verification: Playwright скриншоты dashboard в разных состояниях (empty, with active setup, with failed setup, with limit warnings).

## 🛠 Operational integrations (2026-04-30)

Не блокируют launch как такового, но должны быть в production до первых
платящих клиентов чтобы не пропускать инциденты и метрики.

- **#OPS-1 Sentry integration**
  - Owner создаёт Sentry account (бесплатный план до 5K событий/мес)
  - Передаёт DSN ключ разработчику через secure channel
  - Разработчик встраивает Sentry SDK в Next.js (server + client) и edge runtime
  - Source maps настраиваются для readable stack traces
  - Alert rules: email на owner при unhandled exceptions, performance degradation, error spike

- **#OPS-2 Better Stack status page (post-launch)**
  - Заменяет статичный заглушку `getmailkit.com/status` который ставится в #SMTP-4
  - Better Stack бесплатный план достаточен для micro-SaaS
  - Owner создаёт аккаунт, настраивает probes на `getmailkit.com`, `app.getmailkit.com`, AWS SES API endpoint
  - Embed виджет на нашу страницу `/status` либо CNAME `status.getmailkit.com` на их хост
  - Автоматические incident reports при downtime
  - Post-launch — после первых 50-100 платящих, не сразу при launch

- **#OPS-3 Dogfooding setup для owner**
  - После merge ветки `feat/ses-backend-swap` и production approve от AWS
  - Owner проходит полный flow продукта на собственном домене getmailkit.com
  - Настраивает `support@getmailkit.com` через свой собственный продукт
  - Цели: реальный end-to-end smoke test (payment → wizard → DKIM async → Gmail Send-As → готово), catch-bug stage до открытия для платящих, плюс настройка production support email
  - После dogfooding — запись отзыва на основе личного опыта для будущего marketing
  - Замечания и баги в процессе → отдельный тикет либо сразу в работу

## 🤖 AI support bot (RAG) на лендинге (2026-04-30)

Цель — закрыть 90-95% вопросов клиентов автоматически без участия owner'а.
Эскалация на email только для редких сложных кейсов.

- **#RAG-1** Vector store с базой знаний:
  - FAQ (все вопросы и ответы с лендинга)
  - Excerpts из ToS / Acceptable Use Policy / Guarantee Policy
  - Setup wizard инструкции
  - Список лимитов с конкретными цифрами
  - Troubleshooting по типичным проблемам (DKIM не верифицируется, Gmail Send-As не сохраняет credentials, домен не на Cloudflare)
  - Эмбеддинги через OpenAI text-embedding-3-small либо Anthropic-совместимая альтернатива
  - Хранение в Supabase pgvector (уже есть в стеке, не нужна отдельная инфра)
- **#RAG-2** Backend route `/api/support/chat`:
  - Принимает вопрос пользователя
  - Делает similarity search в pgvector
  - Передаёт top-K результатов в Claude/GPT-4o-mini как контекст
  - Возвращает ответ + confidence score
  - При confidence < 70% — предлагает «не нашёл точный ответ, написать в support@»
- **#RAG-3** Frontend виджет:
  - Кнопка чата в правом нижнем углу лендинга и личного кабинета
  - Открывается окошко chat UI
  - История диалога в localStorage (не персистится в БД для privacy)
  - Стандартные suggested questions при открытии («Сколько занимает настройка?», «Что если у меня домен не на Cloudflare?», «Какие лимиты на отправку?»)
- **#RAG-4** Эскалация:
  - При negative feedback от пользователя («это не помогло») — автоматически открывается mailto:support@getmailkit.com с историей чата в теле письма
  - Owner получает контекст вопроса + что бот ответил, может отвечать предметно

Time estimate: 1-2 дня dev работы. Trigger для запуска — после launch'а либо параллельно если AWS approval затянется. Зависимости — Supabase pgvector extension (включить через миграцию).

## 🚨 BLOCKING LAUNCH — Rate limits в публичных текстах (2026-04-30)

Лимиты на отправку (500 писем в день, 50 в час, 5 в минуту с одного
клиентского домена) сейчас прописаны только в коде `lib/send-limits.ts`.
Должны быть видны клиентам до и после покупки.

- **#LIMITS-1** В FAQ на лендинге добавить пункт «Какие лимиты на отправку?» с конкретными цифрами и объяснением что лимиты можно увеличить по запросу через support после первого месяца использования.
- **#LIMITS-2** В Terms of Service / Acceptable Use Policy добавить формальное описание лимитов как часть условий использования.
- **#LIMITS-3** В личном кабинете клиента (после покупки) сделать страницу «Your sending limits» с текущими цифрами и счётчиком использованных писем за день/час.
- **#LIMITS-4** В onboarding email после успешной настройки добавить одно предложение про лимиты со ссылкой на FAQ.

Конкретные цифры брать из `lib/send-limits.ts` константы `DEFAULT_SEND_LIMITS`.
Делается параллельно с веткой `feat/smtp-dependency-disclosure`.

## 🚨 BLOCKING LAUNCH — SMTP incident response infrastructure (2026-04-29)

Полный план в [docs/INCIDENT_RUNBOOK_SMTP.md](INCIDENT_RUNBOOK_SMTP.md).
Эти 4 механизма должны работать ДО запуска на Product Hunt:

- **#SMTP-1** Backend switch automation: скрипты массового создания AWS SES sender identities + DKIM update в CF DNS из users table. Сейчас ничего нет, нужно построить (3-5 дней dev).
- **#SMTP-2** Mass notification email templates EN/RU + automated рассылка по affected users. Включает 4 follow-up cadence (T+24h, T+72h, T+7d, T+14d).
- **#SMTP-3** In-product banner UI в `app.getmailkit.com`: красный sticky-top, "Action required: update SMTP credentials", не убирается до verification на странице `/setup/verify-migration`.
- **#SMTP-4** Status page заглушка на `getmailkit.com/status` (минимум статичная "All systems operational" + ссылка на @MailKitHQ Twitter). Полноценная (UptimeRobot/Better Stack) — post-launch.
- **#SMTP-5** Sentry alerts на Postmark API errors threshold + SMS/Telegram notification на owner.

Trigger для работы: после merge ветки `feat/smtp-dependency-disclosure`. Без этих 5 пунктов launch на Product Hunt блокирован — иначе incident может убить репутацию в первые же недели.

## 🔨 MVP v1 (build now, 3-4 weeks total)
- #2 Production scaffold (done)
- #3 Auth + Google OAuth flow (done, PR #8)
- #4 Setup pipeline backend (Cloudflare + Postmark in TS)
  - #4a Cloudflare pipeline (done, merged PR #10)
  - #4b Postmark SMTP integration
    - **Pre-requisites (MUST fix before Postmark API calls):**
      - **SPF merge policy**: если `@ TXT v=spf1` уже существует — merge
        (добавить `include:<postmark>` сохранив existing includes), не
        overwrite. Нужен parser для SPF mechanism list
        (`include:`, `ip4:`, `ip6:`, `a:`, `mx:`, `~all`/`-all`/`+all`).
      - **Content-pattern upsert**: match TXT records по content prefix
        (`v=spf1` / `v=DMARC1` / `pm-bounces:` /
        `google-site-verification:`), не first-match по позиции. В
        `listDnsRecords` добавить фильтр + pattern-match helper.
- #5 Onboarding UI wizard
- #6 Gmail Send-As guided step UI
- #7 Lemon Squeezy payment ($5 single SKU)
  - **Включить в scope #7 (обязательно до launch):**
    - Webhook handler для `order.paid` / `order.refunded` events от Lemon
      Squeezy → обновление `purchases` table + `refunds` audit log.
    - Auto-refund trigger при `setup_runs.status → failed` где
      `failed_step ∈ {cf_*, postmark_*}` → вызов Lemon Squeezy `POST /refunds`
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
    с `failed_step ∈ {cf_*, postmark_*}` → вызов Lemon Squeezy refund API →
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

## 🚨 BLOCKING PRODUCTION LAUNCH — Checkout flow (2026-05-08)

- **#FLOW-1 Sign-in-first checkout with CF prereq validation**

  **Контекст:** текущий hero CTA → LS checkout напрямую (unauth first-buy).
  Анти-паттерн для MailKit: у продукта жёсткий prereq — домен на Cloudflare
  DNS. Юзер может заплатить $5, потом узнать что нужна миграция NS → refund
  fraud-риск + support нагрузка + удар по deliverability метрикам.

  **Целевой флоу:**
  1. CTA → Sign in through Google (one-tap, ~3 sec)
  2. → `/app/setup` — форма: domain + mailbox name + CF API token
  3. Продукт делает NS lookup для домена → проверяет что NS на Cloudflare
  4. Если домен не на CF → блокируем с объяснением и инструкцией по миграции
  5. Если домен на CF → показываем "Continue to payment — $5" → LS checkout
  6. После оплаты → wizard продолжается с того же шага, делает CF setup автоматически

  **Почему блокер:**
  - Убирает fraud-refunds от юзеров не на CF
  - Юзер видит до платежа что от него нужно (CF token, mailbox name) → снижает abandonment
  - NS lookup — server-side, бесплатно, без extra deps

  **Не блокер для:** pre-flight dogfood (обходим через Supabase INSERT напрямую).
  **Блокер для:** LS Live mode + финального dogfood с реальной картой + Product Hunt launch.

  **Scope:**
  - Hero CTA + pricing CTA + final CTA: `href` → `/app/setup` вместо LS URL
  - `/app/setup` wizard step 0: CF prereq check (NS lookup) перед показом
    формы токена
  - После CF check pass → кнопка "Buy — $5" → `/api/checkout/start` (уже есть,
    stamp user_id в LS URL)
  - LS webhook после оплаты → wizard продолжается (уже есть `paid=1` логика)
  - Fallback: если юзер уже заплатил (purchase row exists) → skip prereq check,
    пустить в wizard напрямую

## 🚫 Post-validation (do NOT build until ≥100 paying users or explicit architect approval)
- #8 Self-serve diagnostics & re-setup flow
- #9 Deliverability monitoring subscription
- #10 3-mailbox bundle SKU ($12)
- #12 Chrome Extension for Gmail step
- #13 Workspace-only automation (Phase B)
- #14 White-label for agencies
- #15 Multi-domain dashboard

## 🎨 Design v2 follow-up cosmetics (post-launch, низкий приоритет)
Две косметические правки выявленные на V2-approve визуальной ревизии 2026-04-28. Не блокеры запуска — собрать в один мини-PR когда вернёмся к UI/UX iterations.

- MAILKIT pill в hero Gmail-mockup использует uppercase, тогда как фактический wordmark в navbar — `Mailkit` с capital M. Привести pill к согласованному casing'у `Mailkit` для brand consistency.
- Cookie consent banner на 768px viewport (tablet portrait) — sentinel-порог появления баннера сейчас 100vh, в момент scroll на этом разрешении баннер перекрывает subhead в hero. Поднять порог до ~130vh чтобы баннер появлялся после первого экрана.

## 🐛 Pre-existing bugs (P3, non-blocking)
- **#CRON-FIX-1** Empty-state DKIM cron returns 500 instead of 200.
  `GET /api/cron/check-dkim-status` with no pending DKIM rows in DB returns 500.
  Should return `200 { outcome: 'no_pending', checked: 0 }`.
  **Impact:** Vercel cron dashboard shows red every minute, Sentry catches as
  unhandled error once DSN is live. Fix: add empty-result early-return before
  the main loop. **Fix timing:** after Boris's dogfood, before first post-launch day.

- #21 ThemeToggle hydration mismatch — SSR/client aria-label расходится ("светлую" vs "тёмную"). Стандартный next-themes SSR баг. Не ломает функциональность. Fix: `suppressHydrationWarning` на button или `useEffect` для aria-label.
- #22 gmail.svg image warning — Next.js предупреждает что изменён width или height без второго измерения. Fix: добавить `width="auto"` или `height="auto"` к img тегу. Косметика, не влияет на рендер.

## 🧹 Tech debt

- **#CLEANUP-RU-LEGACY** Finish Russian locale removal (feat/cleanup-ru-final)
  Incomplete cleanup after feat/remove-russian-locale. Russian constants and
  routes still live on production. Blocks launch — legal pages at /ru/*
  reference outdated Brevo text (not updated to Postmark) and incomplete
  GDPR formulation.
  Scope:
  - Remove /ru/privacy, /ru/terms, /ru/guarantee routes or redirect → EN
  - Delete PRIVACY_RU, TERMS_RU, GUARANTEE_RU from lib/legal/*.ts
  - Grep project for `_RU`, `'ru'`, `"ru"`, `ru.json` — review and remove
  - Delete any remaining RU test assertions in lib/legal/*.test.ts
  - Playwright verify: /ru/* → 404 or redirect, no Russian text on live site
  Branch: feat/cleanup-ru-final (after LEGAL-1 merge)

- LS checkout store migration — **pre-launch BLOCKER**, owner contacting LS support.
  - Current: product в velabot store (owner's другой project), checkout
    URL показывает `velabot.lemonsqueezy.com/checkout/buy/<uuid>` в
    address bar — чужой бренд в URL перед покупкой MailKit.
  - Причина: LS требует contact-support для создания second store на
    одном аккаунте. Appropriated velabot store под MailKit product
    временно, чтобы разблокировать #11 landing development.
  - Target options (любое рабочее решение принимается):
    - Separate MailKit LS store — pending LS support ответа
    - Custom checkout domain `checkout.getmailkit.com` mapped к velabot
      store — LS supports это на Pro plan, не требует миграции продукта
    - Второй LS account под MailKit brand — fallback если support
      отказывает и Pro plan не вариант
  - Trigger: owner relays new URL from LS → dev swaps constant в
    [lib/constants/lemon-squeezy.ts](../lib/constants/lemon-squeezy.ts)
    → redeploy preview → verify в browser. 30-секундная правка.
  - Timeline: 1-2 дня, зависит от LS support response time.
  - НЕ блокер для #11 landing code — hardcoded constant, swap одной
    строки при получении нового URL.
- Auto-verification Gmail Send-As via Postmark SMTP test-send + inbox poll.
  Trigger: первая жалоба пользователя «настроил, но не отправляет», либо
  при наборе >100 paying users — тогда оправдана оптимизация funnel
  completion rate. В MVP (#6) принимаем user-asserted confirmation
  (checkbox + server action), verification на честное слово. Техническая
  развилка при реализации: `nodemailer` dep + через Postmark SMTP послать
  тестовое письмо на `target_email`, ждать receipt в Gmail inbox через
  `gmail.readonly` scope + polling. Обе side-effect'а — новые зависимости,
  доп. OAuth consent-screen trust ("зачем им читать мою почту?"). Если
  landing этого фичера снизит conversion — откатывать.
- Postmark per-tenant credential rotation UX: re-paste banner когда
  `POSTMARK_SERVER_TOKEN_VERSION` в env > `gmail_state.smtp_config_version` в
  run. Post-launch, триггер "первая abuse incident либо плановая 90-day rotation".
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
  - **Post-#4b check** (2026-04-23, merge 18b6d42 + ~13h warm, n=5/locale median, methodology в [POST_MERGE_SOP.md](investigation-2026-04-22/POST_MERGE_SOP.md)): EN 75 (vs post-#4a 77, delta −2 = noise), RU 85 (vs post-#4a 74, delta +11 = improvement). #4b не добавил регрессии; previewный "RU −12" сигнал был lambda cold-start variance, не код. Investigation closed. Systemic perf work renames → **attempt-3** scope: `NextIntlClientProvider` `pick(messages,...)`, selective `

---

## #LEGAL-1 — Privacy Policy update for Postmark as US-based data processor

**Status:** Backlog  
**Priority:** Pre-launch (non-blocking for first launch, required within 30 days)

Postmark is registered in the US (AC Lion Digital LLC, Pennsylvania). Brevo was
EU-based (France). This changes the cross-border data transfer profile for GDPR.

**What needs updating in Privacy Policy:**

1. Add SCC reference: data transferred to Postmark (US) is protected under
   Standard Contractual Clauses per Postmark DPA.
2. Specify exact categories of data sent to Postmark:
   - Email addresses of MailKit customers (To/From fields)
   - Content of transactional notifications (auto-refund text, abuse warnings)
   - IP addresses captured in Postmark delivery logs
3. Link to Postmark DPA: https://postmarkapp.com/dpa (verify URL exists)
4. Update data retention section to reflect Postmark's retention defaults
   (check Postmark docs for current log retention period).

**Note:** Current privacy.ts change (Brevo → Postmark name swap) is baseline
correctness. This ticket covers the GDPR-completeness layer.

---

## #DB-MIGRATE-1 — Rename brevo_* status values to smtp_* through data migration

**Status:** Backlog  
**Trigger:** 30+ дней после успешного launch без incidents

DB status values `brevo_sender_created`, `brevo_dns_written`, `brevo_verified`,
`brevo_done` сохранены для backward compatibility с existing rows в setup_runs.

**Options:**
A. UPDATE existing rows: set status = 'smtp_' + substring(status, 7) where status like 'brevo_%'
B. Просто удалить stale failed setup_runs старше 60 дней — чище

**CHECK constraint** в migration 0004 тоже потребует обновления при переименовании значений.

**Pre-conditions:**
- 30+ дней без incidents на production
- No rows in non-terminal brevo_* states (все завершены или failed)
- Координация с Boris на момент выполнения
