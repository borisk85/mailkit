# MailKit — CLAUDE.md

## ⚠ Copy & UI rules (критично — уроки 2026-04-29)

Эти правила перенесены в CLAUDE.md специально, чтобы они были в
контексте каждой сессии (не в private memory).

### 1. Никогда не push копи без утверждения owner'ом

Любой текст, который рендерится на сайте — headline, subhead, CTA,
trust note, banner, cookie, error, FAQ, любая i18n строка — НЕ
коммитится и НЕ пушится без явного «ок» от Boris.

Алгоритм:
1. Сделать локальную правку.
2. Показать exact текст что собираюсь закоммитить.
3. Дождаться "ок" / "пушь" / "давай" — или counter-text.
4. Только тогда `git commit` + `git push`.

Если есть несколько вариантов — показать как A/B/C, не выбирать сам.

Это правило НЕ блокирует layout/CSS правки (alignment, sizing, color,
padding) — только текст.

### 2. Не изобретать копи самостоятельно

Boris диктует точный текст — я вставляю verbatim. Не "улучшаю", не
перефразирую. Если Boris просит draft — даю 1-2 коротких варианта и
останавливаюсь.

### 3. Бан жаргона и бытовой лексики

В B2B SaaS копи запрещены:
- Бытовые слова: «возня», «херня», «хрень» — это форум, не продукт.
- Технический жаргон без контекста: «трекинг», «автоматика» (как
  существительное системы), «под капотом» — юзер не должен это
  парсить.
- Корпоративный жаргон: «КП», «Q2», «pipeline», «orchestrate» — для
  холодного гостя.

### 4. Layout-fit перед push

После любой правки текста — `pnpm dev` + Playwright screenshot обеих
локалей (`/en` и `/ru`). RU слова на 30-40% длиннее EN, headline
часто wraps на 2-3 строки больше чем в JSON выглядит. Без скрина
не пушим.

### 5. Бренд-иконки только официальные

Для логотипов сторонних сервисов (Cloudflare, Brevo, Gmail,
Google и т.д.) — НЕ рисовать самописные SVG approximations.
Источники:
- `react-icons/si` (Simple Icons, CC0 license) — для monochrome
  silhouettes в brand color.
- Wikimedia Commons → `/public/brand/<name>.svg` — для multi-color
  оригиналов (Gmail envelope и т.п.).
- Owner может скинуть SVG из brand-resource страницы → положить
  в `/public/brand/`.

### 6. Не выходить за scope правки

Если Boris сказал «иконки маленькие, скучные» — это значит
увеличить иконки и добавить контраст. Это НЕ значит redesign'ить
секцию в grid из 3 карточек с heading и описаниями. Match the
verb literally; structural changes — пропоузить, не пушить.

## ⚠ Scope Discipline (критично)

MVP v1 scope зафиксирован в [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
раздел **"MVP v1 Scope — STRICT BOUNDARY"**.

**Default action при любом предложении новой фичи:** сначала проверь,
входит ли в MVP v1 scope. Если НЕТ — не писать код, добавить в backlog,
напомнить владельцу о scope discipline.

**Не писать код на фичи из backlog** (self-serve diagnostics, re-setup,
monitoring, bundles, Chrome Extension, Workspace version, white-label,
multi-domain, etc.) до явного разрешения после валидации с реальными
юзерами.

Если в сессии возникает идея «а давай еще добавим...» — остановись,
проверь scope, спроси владельца.

## Quick context
Hybrid MVP SaaS: automates Cloudflare Email Routing + Brevo SMTP setup on the
user's domain, then guides the user through the Gmail Send-As final step via a
3-minute copy-paste wizard. **$5 per mailbox** setup.

### Target audience (MVP)

Широкая аудитория, не только indie hackers. Расширено 2026-04-23:

1. **Indie hackers / solo developers** — хотят `hello@myproduct.com` вместо
   личного Gmail. Технически грамотные, ценят шорткат.
2. **SMB owners / малые предприниматели** — магазины, сервисы, консалтинг.
   Хотят `info@mybiz.com` для профессионализма. Технически **не** грамотны
   — наш wizard для них часто единственный способ.
3. **Freelancers / consultants / coaches** — `hello@myname.com` для
   client communication. Средний tech-level, время дороже технарства.
4. **Small agencies (2-10 человек)** — настраивают custom email для
   клиентов. Power-user потенциал через 3-mailbox bundle SKU (#10 в
   backlog, post-validation).
5. **Non-English entrepreneurs (RU, другие)** — SMB сегмент где Google
   Workspace за $6/user/mo — дороговато, а domain email нужен для
   доверия клиентов. EN/RU локализация first-class.

Marketing angles и objection handling per сегменту: see
[docs/MARKETING_ANGLES.md](docs/MARKETING_ANGLES.md)

Post-launch support: 30-day functional guarantee + automation-failure
auto-refund + self-serve diagnostics + $3 re-setup or $3/mo monitoring
subscription. Full guarantee policy:
[docs/GUARANTEE_POLICY.md](docs/GUARANTEE_POLICY.md). Support model details:
[docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md) "Post-launch Support Model".

Marketing / channel strategy: see [docs/GO_TO_MARKET.md](docs/GO_TO_MARKET.md)
(owner responsibility, not in code scope).

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
- Tagline: "Email on your domain in 5 minutes, guaranteed."
- Metric when asked: "We automate 100% of the technical complexity. You do 3
  simple copy-paste actions."
- **Never** say: "0 clicks", "full auto", "90% automation", "zero setup" — it's
  a stretch and breaks trust on first run.
- Guarantee: two-tier. Automation-failure auto-refund (if our CF/Brevo
  setup fails on backend) + 30-day functional guarantee (if you can't
  actually send/receive email via configured setup). NOT tied to user
  pace on Gmail wizard step. Full policy:
  [docs/GUARANTEE_POLICY.md](docs/GUARANTEE_POLICY.md).

## Known constraints
- Gmail `sendAs.create` blocked on personal @gmail (requires Workspace DWD)
- Gmail step accepted as 3-min guided UX for MVP
- Chrome Extension planned for v2 to reduce Gmail step to ~20 sec (legal
  research + Chrome Store ToS review required BEFORE dev)
- Brevo ops: single shared account handles all customer sender domains
- Honest positioning: "5 min, guaranteed" — backed by two-tier policy in
  [docs/GUARANTEE_POLICY.md](docs/GUARANTEE_POLICY.md), not a loose
  marketing claim
- Vercel Framework Preset фиксируется при первом подключении repo.
  Если подключил до scaffold merge — руками поправить в Settings
  после merge. См. [docs/LESSONS_LEARNED.md](docs/LESSONS_LEARNED.md)

## What NOT to do
- Don't build audit tool / DNS checker — out of scope for MVP
- Don't add freemium or trials — attracts spammers (domain abuse on shared Brevo)
- Don't add done-for-you services — doesn't scale
- Don't over-engineer — MVP first, optimize after traffic
- Don't touch Cloudflare/Brevo/Gmail code without reading
  [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md) first
- Don't re-introduce Resend — Brevo handles transactional too
- Don't offer free lifetime support — upsell to monitoring or charge for
  re-setup after 30 days
- Don't build live chat for MVP — email only

## UI Verification Workflow (важно)

Для любой работы над UI компонентами ОБЯЗАНО проверять результат через
Playwright MCP, не полагаясь на «код выглядит правильно».

Правильный цикл:
1. Написать/изменить компонент
2. Запустить `pnpm dev` в фоне
3. Через Playwright MCP: открыть страницу, сделать скриншот
4. Визуально проверить результат
5. Если есть проблемы — итерировать
6. Только когда визуально все ок — показывать владельцу

**Не присылай владельцу на проверку незавершенный UI.** Владелец не будет
делать скриншоты сам — если нужна визуальная проверка, делай через MCP.

### Что MCP МОЖЕТ проверить
- Layout страниц, responsive поведение
- Состояния компонентов (hover, disabled, loading, error)
- Формы: валидация, submit
- Навигация между страницами
- i18n переключение EN/RU
- Console errors в браузере

### Что MCP НЕ может проверить (попросить владельца)
- Реальный Google OAuth flow (нужен живой Google аккаунт)
- Реальный Lemon Squeezy checkout (нужны реальные платежи)
- Реальная отправка/приход email через Gmail
- Внешние API calls к Cloudflare/Brevo с реальными ключами (money/time
  burn — лучше мокать в dev)

Для этих кейсов — в PR description секция "Manual verification needed
from owner" со списком что и как проверить.

### Performance quality gate (обязательно для всех UI-тикетов)

Перед merge любого PR с изменениями публичных страниц (landing, auth,
onboarding, dashboard) запускай Lighthouse через `npx lighthouse` или
Playwright+Lighthouse integration.

Минимальные таргеты (не merge при фейле любого):
- Performance: ≥90
- SEO: ≥95
- Accessibility: ≥90
- Best Practices: ≥90
- LCP <2.5s, CLS <0.1, TBT <200ms, FCP <1.8s

Проверять обе локали: `/en` и `/ru` — Next.js i18n может добавить
нагрузку на инициализацию.

Если PR ломает метрики — НЕ мержим. Либо фикс в том же PR, либо явное
решение архитектора принять регрессию.

### Preview vs prod Lighthouse — что gating, что нет

Установлено 2026-04-22 (investigation 4a/4b):
Preview-deploy Lighthouse — **non-gating** signal. Preview lambdas имеют
cold-start variance до ×15 на TBT run-over-run на идентичном URL
(реальный замер: TBT 326→260→21 ms, три runs подряд). Использовать
preview LH для грубого smoke «не сломали ли порядок величин», не для
merge-gate с дельтами <20 points.

Prod Lighthouse — **gating**, но только при корректной методологии:

- ≥60 минут warm на prod alias до первого измерения (CDN + lambda pool)
- n≥10 TTFB curl samples для baseline stability check (trim min/max
  перед median — outlier 1.29s в одном из 10 сдвигает median на ~100ms
  и создает false regression signal)
- n≥5 LH runs per locale, median (не single run)
- Сравнение с сохраненными prod baselines, не с preview
- Сохраняй raw JSON runs — future comparisons должны быть
  apples-to-apples, same methodology

Current stored prod baselines (mailkit-ten.vercel.app, landing):
- Pre-#4a: EN 87 / RU 87
- Post-#4a stable warm: EN 77 / RU 74
- Post-#4b stable warm: EN 75 / RU 85 (2026-04-23, landing)
- Post-#6 stable warm: EN 73 / RU 70 (2026-04-24, 12h post-merge, n=5 each)

EN on a gentle downslope across features (87 → 77 → 75 → 73 — each −2 is in noise range). RU swings wider (87 → 74 → 85 → 70) — historically variance-prone at prod. Both locales still clear the ≥70 acceptance threshold post-#6. Systemic perf attempt-3 (next-intl `pick`, selective dynamic route segments, bundle analyzer) is the path back into the 80s+, in `docs/TICKETS_BACKLOG.md`.

Full investigation и SOP: [docs/investigation-2026-04-22/FINDINGS.md](docs/investigation-2026-04-22/FINDINGS.md) + [docs/ticket-6-post-merge/summary.md](docs/ticket-6-post-merge/summary.md)

## Issues policy — solo vibe-coding mode

Проект ведется в solo режиме (владелец + Claude Code). GitHub Issues
избыточны для нашего размера команды. Единственный источник правды
для трекинга задач — [docs/TICKETS_BACKLOG.md](docs/TICKETS_BACKLOG.md).

### Не создавать Issues по умолчанию

Для tech debt, feature ideas, refactoring tasks — писать прямо в
`TICKETS_BACKLOG.md` в соответствующую секцию (MVP, Post-validation,
Tech debt).

### Когда Issues все-таки уместны

- Bug, который пользователь может воспроизвести (нужна трассируемая
  история с комментариями)
- Внешний контрибьютор мог бы подхватить (open source scenario)
- Критичный блокер релиза — хочется видеть в GitHub UI для owner'а

### Существующий Issue #7 (performance) — оставляем

Не закрываем. Но новые подобные задачи идут в `TICKETS_BACKLOG.md`,
не в Issues.

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
