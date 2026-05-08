# MailKit — CLAUDE.md

## ⚠ Communication rules (критично)

- НИКОГДА не советовать Boris сделать hard refresh / Ctrl+Shift+R / очистить кеш.
  Он знает что делает. Если изменения не видны — искать проблему в коде/деплое.

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

### 8. Проверять дубли слов перед вставкой копи

Перед добавлением любого слова/бренда в текст — проверить:
- Есть ли это слово уже в заголовке той же карточки/секции?
- Есть ли оно в соседних элементах (eyebrow, title, body, subheading)?

Если слово уже есть рядом — предупредить Boris: "Слово X уже в заголовке,
добавление в body создаёт повтор. Убрать из заголовка или не добавлять в body?"

Пример провала: Boris попросил вставить "Cloudflare" в body step1.
Title уже содержал "Cloudflare". Надо было сказать — не слепо вставить.

### 9. Нечеткое UI-задание → сначала reference, потом реализация

Когда Boris дает нечеткую дизайн-задачу («сделай тенью», «добавь эффект»,
«как в нормальных сайтах»):

1. Найти reference: `c:/Claude Code/vibecraft` или `c:/Claude Code/agent-builder-saas`
   — посмотреть как там реализована похожая штука
2. Предложить подход в 1-2 строках + screenshot plan
3. Только после ок от Boris — реализовывать

НЕ реализовывать первую интерпретацию вслепую. Пример провала:
«сделать тенью» → я сделал 96px водяной знак + оставил дубль малой цифры.
Надо было: проверить vibecraft (там text-5xl watermark без дубля), предложить.

### 10. Русский копи — литературный язык, не интернет-мусор

При любом русском тексте на сайте: писать так, как говорят живые люди,
а не как переведённый с английского или выдранный из SEO-статьи.

Конкретно:
- «возврата средств» — не «возврата денег» (деловой регистр)
- Избегать канцелярита и кальки с английского
- Перед предложением варианта — спросить: «звучит ли это как нормальный
  русский язык или как переведённый?»
- Если сомневаешься в формулировке — дай Boris короткий черновик,
  он поправит. Его слова всегда точнее.

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
Hybrid MVP SaaS: **email setup automation** для пользователей Cloudflare DNS.
Автоматизирует настройку Cloudflare Email Routing + AWS SES + DKIM/SPF/DMARC,
ведёт пользователя через 3-минутный мастер Gmail Send-As. **$5 per mailbox**
setup. **Полное время настройки — за час** (10 минут активной работы юзера +
2-30 минут асинхронной AWS DKIM проверки + 3 минуты Gmail wizard).

**Категория продукта — НЕ email marketing platform.** Мы не отправляем
рассылки, не управляем кампаниями, не делаем сегментацию. Мы — domain email
setup automation tool. Эта категория не пересекается с Mailkit s.r.o.
(чешская email marketing platform, основана 2006), что важно для
positioning и SEO targeting.

**Запрещённые self-descriptions** (создают коллизию с Mailkit s.r.o.):
- email marketing platform
- email service provider
- transactional email service
- email infrastructure platform
- ESP (email service provider)

**Правильные self-descriptions:**
- email setup automation
- domain email setup tool
- automated DNS configuration for email
- Cloudflare Email Routing automation
- Gmail Send-As setup wizard
- professional email on your domain (без слова "platform")

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
Strategic risks register: [docs/RISKS.md](docs/RISKS.md) (R1: Cloudflare wizard, R2: Brevo ban, R3: silent failover impossible, R4: Google API changes, R5: Lemon Squeezy freeze).
SMTP incident response runbook: [docs/INCIDENT_RUNBOOK_SMTP.md](docs/INCIDENT_RUNBOOK_SMTP.md) — пошаговый план detection→backend switch→user notification→14-day migration window для SMTP backend failure.

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
- next-intl (EN only — RU убран 2026-04-30 после анализа CF audience: 50%+ английский, 2.5% русский. Не оправдывает накладных расходов на поддержку двуязычного копи для micro-SaaS масштаба)
- Supabase (auth + DB, RLS enabled)
- Lemon Squeezy payments (Stripe unavailable in KZ)
- Hosted on Vercel, domain getmailkit.com

## Pricing
- Pay-per-setup: **$5** (1 mailbox). Bundle 3 mailbox за **$10** (33% скидка) — post-launch, не в v1. Agency tier 5 mailbox за $15 — backlog.
- Subscription: **$3/mo** deliverability monitoring per domain (optional)
- Aliases: free bundled with paid mailbox (unlimited via CF Email Routing)

## Honest positioning (updated 2026-04-29 v2 — repositioned от скорости к снятию боли)

**Стратегический сдвиг 2026-04-29 v2:** убираем "под 10 минут" из main
selling point. Скорость для этой аудитории не имеет ценности — email
setup не задача "сделать срочно", юзер может терпеть часы. Реальная
боль: страх разобраться самому, не понимаю DNS/SMTP/DKIM, боюсь сломать.

- Tagline EN: **"Professional email on your domain — without the DNS headache."**
- Tagline RU: **"Профессиональная почта на твоём домене — без часа возни с настройками."**
- Subhead: "We set up Cloudflare and Amazon SES for you. You keep using your regular Gmail."
- Audience explicit: "For Cloudflare DNS users. Domain on GoDaddy / Namecheap / Squarespace / other? Migrate nameservers to Cloudflare first."
- Time mentions only in FAQ: "10 минут активной работы юзера + 5-30 мин асинхронной проверки на стороне Amazon. Мы пишем на email когда готово к финальному шагу."
- **Never** say: "0 clicks", "full auto", "90% automation", "zero setup",
  "any domain", "any DNS provider", "5 minutes", "under 10 minutes" в главном
  positioning. Все эти фразы либо overpromise либо ставят скорость в
  центр которая не наш main value.
- **Value drivers (по приоритету):**
  1. Снятие боли разбираться в технике
  2. Гарантия что работает (auto-refund + 30-day functional)
  3. Дешевле Workspace ($5 разово vs $72/год)
  4. Без подписки (vs SendMailAs $29/год)
  5. Привычный Gmail остаётся (vs Zoho/Workspace which replace inbox)
  6. Скорость — side benefit, не центральный
- Guarantee: two-tier. Automation-failure auto-refund (if our CF/Brevo
  setup fails on backend) + 30-day functional guarantee (if you can't
  actually send/receive email via configured setup). NOT tied to user
  pace on Gmail wizard step или Cloudflare migration time для тех кто
  не на CF. Full policy: [docs/GUARANTEE_POLICY.md](docs/GUARANTEE_POLICY.md).

## Known constraints
- Gmail step accepted as 3-min guided UX for MVP; Chrome Extension planned v2 (ToS review first)
- Honest positioning: "5 min, guaranteed" — two-tier policy, not a loose claim
- Vercel Framework Preset фиксируется при первом подключении repo — поправить в Settings после merge

## Перед кодом — допущения вслух, не после провала

Если задача неоднозначна или есть несколько способов реализовать — сначала озвучить что именно собираюсь делать и какие принял допущения. Не угадывать молча, не прятать замешательство.

**Self-check перед финальным кодом:** «сказал бы опытный разработчик что это переусложнено?» Если да — упростить до минимума, решающего задачу.

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
- Базовая i18n инфраструктура (single locale EN после удаления RU 2026-04-30)
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

Перед merge любого PR с изменениям