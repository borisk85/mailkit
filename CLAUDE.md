# MailKit — CLAUDE.md

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
3-minute copy-paste wizard. Target: **$5 per mailbox** setup for indie hackers
with personal Gmail accounts.

Marketing angles and objection handling: see [docs/MARKETING_ANGLES.md](docs/MARKETING_ANGLES.md)

Post-launch support: 30-day guarantee + self-serve diagnostics + $3 re-setup
or $3/mo monitoring subscription. See [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
"Post-launch Support Model".

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
- Money-back guarantee if >5 minutes.

## Known constraints
- Gmail `sendAs.create` blocked on personal @gmail (requires Workspace DWD)
- Gmail step accepted as 3-min guided UX for MVP
- Chrome Extension planned for v2 to reduce Gmail step to ~20 sec (legal
  research + Chrome Store ToS review required BEFORE dev)
- Brevo ops: single shared account handles all customer sender domains
- Honest positioning: "5 min, guaranteed" — no "0 clicks" claims
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
