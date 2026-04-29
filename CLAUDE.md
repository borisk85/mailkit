# MailKit — CLAUDE.md

## ⚠ Fact-check before draft (критично)

Перед любым копи-драфтом о продукте — шагах, времени, что делает юзер
vs что делаем мы — ОБЯЗАТЕЛЬНО прочитать код:
- Шаги флоу → `app/[locale]/app/setup/actions.ts` + `setup-wizard.tsx`
- Тайминги → `messages/{en,ru}.json` (текущие значения)
- Что юзер делает сам → `messages/{en,ru}.json` секция `problem.with.steps`

Нельзя писать технические утверждения из головы. Если не знаешь — читать
код, потом отвечать.

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
4. После одобрения — `git commit` + `git push` молча, без
   переспрашиваний "пушить?". Одобрение текста = одобрение пуша.

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

### 7. Обязательная проверка scope перед каждым Edit

Перед ЛЮБЫМ изменением кода — произнести вслух:
> "Boris попросил [X]. Я меняю [Y]. Y входит в X полностью?"

Если Y содержит что-то чего нет в X — стоп, спросить Boris.

Примеры того что блокируется:
- Добавление `href` если Boris не написал URL
- Скрытие элемента если Boris не сказал "убери"
- Любое новое поведение, атрибут, логика — если Boris не назвал их явно

Правило универсальное — не только для landing, для любого файла.

### 8. Нечеткое UI-задание → сначала reference, потом реализация

Когда Boris дает нечеткую дизайн-задачу («сделай тенью», «добавь эффект»,
«как в нормальных сайтах»):

1. Найти reference: `c:/Claude Code/vibecraft` или `c:/Claude Code/agent-builder-saas`
   — посмотреть как там реализована похожая штука
2. Предложить подход в 1-2 строках + screenshot plan
3. Только после ок от Boris — реализовывать

НЕ реализовывать первую интерпретацию вслепую. Пример провала:
«сделать тенью» → я сделал 96px водяной знак + оставил дубль малой цифры.
Надо было: проверить vibecraft (там text-5xl watermark без дубля), предложить.

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
3-minute copy-paste wizard. **$5 per mailbox** setup. **Под 10 минут полная
настройка** (не 5 минут — честная переоценка после market research 2026-04-29).

### Target audience (MVP) — narrowed 2026-04-29

**ТОЛЬКО пользователи у которых домен на Cloudflare DNS.** Не пытаемся
обслуживать GoDaddy/Namecheap/reg.ru/Squarespace юзеров — для них процесс
требует миграции nameservers на Cloudflare сначала, что нарушает promise
"под 10 минут".

Внутри сегмента CF DNS users (around 2.3M активных доменов глобально per
w3techs) фокусируемся на не-технических SMB которые попали на Cloudflare
через free tier маркетинг ("DDoS защита бесплатно", "ускори свой сайт")
но не имеют технических навыков для настройки Email Routing + Brevo
SMTP + DKIM/SPF/DMARC + Gmail Send-As самостоятельно.

Per market research (docs/AI_SEARCH_STRATEGY.md либо отдельный research
2026-04-29): CF демография примерно 55-60% технические профессионалы /
40-45% не-технические SMB. Технические сделают сами — не наша аудитория.
Не-технические нуждаются в guided automation — это наш TAM.

Realistic TAM расчёт: 2.3M доменов × 40% не-tech × 25% нуждаются в email
× 65% готовы платить = 150-200K потенциальных клиентов глобально. При
$5 на покупку и 0.5-2% capture за год = $3.7K-$15K годовой выручки.
Lifestyle business масштаб, не unicorn. Owner ожидание $500/мес+ как
side income — реалистично достижимо.

Что говорить юзерам не на Cloudflare DNS: "MailKit currently requires
Cloudflare DNS. Migrate nameservers to Cloudflare first (free, ~30 min
plus DNS propagation) либо wait for multi-provider support in roadmap."

Details + marketing angles per segment: [docs/MARKETING_ANGLES.md](docs/MARKETING_ANGLES.md).
Guarantee policy: [docs/GUARANTEE_POLICY.md](docs/GUARANTEE_POLICY.md).

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
- Pay-per-setup: **$5** (1 mailbox). Bundle 3 mailbox за **$10** (33% скидка) — post-launch, не в v1. Agency tier 5 mailbox за $15 — backlog.
- Subscription: **$3/mo** deliverability monitoring per domain (optional)
- Aliases: free bundled with paid mailbox (unlimited via CF Email Routing)

## Honest positioning (updated 2026-04-29 — narrowed)
- Tagline: **"Email on your Cloudflare domain in under 10 minutes, guaranteed."**
  (НЕ "5 minutes" — overpromise; НЕ просто "your domain" — продукт работает
  только если домен на Cloudflare DNS)
- Audience explicit: "For Cloudflare DNS users only. Domain on GoDaddy
  / Namecheap / Squarespace / other? Migrate nameservers to Cloudflare
  first (free, ~30 min) — then setup takes under 10 minutes."
- Metric when asked: "We automate 100% of the Cloudflare + Brevo
  technical setup. You do 3 simple copy-paste actions in Gmail. Total
  under 10 minutes if your domain is already on Cloudflare DNS."
- **Never** say: "0 clicks", "full auto", "90% automation", "zero setup",
  "any domain", "any DNS provider", "5 minutes" — все эти фразы либо
  overpromise либо implying multi-provider support которого нет.
- Guarantee: two-tier. Automation-failure auto-refund (if our CF/Brevo
  setup fails on backend) + 30-day functional guarantee (if you can't
  actually send/receive email via configured setup). NOT tied to user
  pace on Gmail wizard step или Cloudflare migration time для тех кто
  не на CF. Full policy: [docs/GUARANTEE_POLICY.md](docs/GUARANTEE_POLICY.md).

## Known constraints
- Gmail step accepted as 3-min guided UX for MVP; Chrome Extension planned v2 (ToS review first)
- Honest positioning: "5 min, guaranteed" — two-tier policy, not a loose claim
- Vercel Framework Preset фиксируется при первом подключении repo — поправить в Settings после merge

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

Current prod baselines (mailkit-ten.vercel.app, post-#6, n=5 each): EN 73 / RU 70.
Both clear ≥70 threshold. Full history + SOP: [docs/investigation-2026-04-22/FINDINGS.md](docs/investigation-2026-04-22/FINDINGS.md)

## Issues policy — solo vibe-coding mode

Единственный источник правды — [docs/TICKETS_BACKLOG.md](docs/TICKETS_BACKLOG.md). Issues не создавать (solo режим). Исключение: воспроизводимый user-facing bug или критичный блокер релиза. Issue #7 (performance) — оставить открытым.

## Communication style with owner
- На «ты», коротко, без маркдауна в простых ответах, без лекций
- НИКОГДА Е/ё — только Е/е (все, еще, свое, прошел)
- Деплой и push — сразу после правки, без вопросов
- Баги — сразу чинить, без «исправить?»
- Когда owner поправляет — короткое «ок»/