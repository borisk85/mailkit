# MailKit — Product Brief

Version: v2 (post-spike, post-strategy 2026-04-20 evening)
Status: MVP scoped, scaffold in progress
Predecessor: [archive/PRODUCT_BRIEF_v1_pre_spike.md](archive/PRODUCT_BRIEF_v1_pre_spike.md)

---

## Tagline

**EN:** Email on your domain in 5 minutes, guaranteed. Skip 30 minutes of DNS hell.

**RU:** Почта на домене за 5 минут. С гарантией что все работает. Без 30 минут возни с DNS.

### Не говорим никогда
«0 clicks», «full auto», «90% automation», «zero setup» — это натяжка. Реальность:
мы автоматизируем 100% технической сложности, юзер делает 3 простых copy-paste
действия и один клик в Gmail. Это честная формулировка.

---

## MVP v1 Scope — STRICT BOUNDARY

Это решение архитектора от 2026-04-20. НЕ расширять без явного разрешения
владельца проекта.

### What's IN MVP v1 (ship in 3-4 weeks)

1. Landing page (EN + RU, минимальная стилизация)
2. Google OAuth sign-in
3. Cloudflare connection (paste API token ИЛИ OAuth если успеем)
4. Setup pipeline: Cloudflare Email Routing + Brevo sender domain автомат
5. Guided Gmail Send-As UI (3-minute copy-paste шаг с in-product guidance)
6. Lemon Squeezy integration — один SKU: $5 per single mailbox setup
7. Минимальный dashboard: список купленных setup'ов + их email-адреса
8. Email-only support via support@getmailkit.com
9. Performance baseline: Lighthouse ≥90 / SEO ≥95 / Core Web Vitals
   в зеленой зоне на всех публичных страницах (EN и RU)

### What's OUT of MVP v1 (backlog, NOT building yet)

- Self-serve diagnostics / Re-verify button (Ticket #8)
- Paid re-setup flow ($3)
- Monitoring subscription ($3/mo)
- 3-mailbox bundle ($12) — только $5 single в v1
- Chrome Extension
- Workspace-only automation (Phase B)
- White-label for agencies
- Multi-domain dashboard
- Deliverability reputation tools
- Email signature editor
- Any analytics dashboards / metrics exports
- Team members / multi-user accounts
- API для developers

### Rule of engagement

**Не писать код на эти фичи пока первые 100 платящих юзеров явно не
попросят.** Документы и backlog храним как roadmap, не как спецификацию
к сборке.

Каждая фича из backlog → пишется только после:
1. Прямых запросов от минимум 10 платящих юзеров
2. Либо явного решения архитектора после анализа метрик

---

## Суть продукта

SaaS для автоматической настройки корпоративной почты `hello@yourdomain.com`
в существующем Gmail. Убираем боль ручного DNS, SMTP и Send-As setup —
юзер получает готовый почтовый адрес за 5 минут вместо 30-45.

---

## Product strategy

### Path A — MVP (Hybrid)
**Для кого:** indie hackers, solopreneurs на личном Gmail.
**Что делаем:**
- Cloudflare Email Routing + DNS (MX/SPF/DKIM/DMARC) — полностью автоматом через API
- Brevo sender domain + DKIM + SMTP creds — полностью автоматом через API (на нашем shared аккаунте)
- Gmail Send-As — guided UI-wizard: juзер копирует SMTP host/port/username/password в Gmail Settings (deep link), получает verification email, кликает ссылку
**Time to setup:** 5 минут
**Positioning:** "We automate 100% of the technical complexity. You do 3 simple copy-paste actions."

### Path B — v2 (Workspace, 3-6 мес после MVP)
**Для кого:** агентства, SMB с Google Workspace.
**Что делаем:** полная автоматизация через domain-wide delegation (Workspace admin
разрешает service account от нашего имени → `gmail.users.settings.sendAs.create`
работает без ограничений).
**Time to setup:** ~60 секунд.

### Блокер найден на спайке
Gmail API метод `users.settings.sendAs.create` с SMTP MSA возвращает 403
"Access restricted to service accounts that have been delegated domain-wide authority"
для личных `@gmail.com` аккаунтов. Это Google Workspace-only feature.
Подробности и воспроизводимость — [SPIKE_FINDINGS.md](SPIKE_FINDINGS.md).

---

## Финальный user flow (MVP)

| Шаг | Что делает юзер | Что делает система | Время |
|---|---|---|---|
| 1 | OAuth Google | scopes: gmail.settings.sharing, gmail.readonly, gmail.send | 30 sec |
| 2 | OAuth Cloudflare (или paste API token) | валидация токена, list zones | 30 sec |
| 3 | Вводит mailbox name (`hello`) | парсит домен из zone list | 10 sec |
| 4 | Ждет прогресс-бар | CF: Email Routing + MX/SPF/DMARC + routing rule<br>Brevo: sender domain + DKIM + SMTP creds<br>DKIM back to CF DNS<br>Brevo verification polling | ~90 sec |
| 5 | Guided Gmail Send-As: copy (1 клик) → Gmail deep link → paste → click verify link | показывает SMTP creds, deep link в `mail.google.com/mail/u/0/#settings/accounts` | 3 min |
| 6 | Клик "Done" в MailKit | посылает тестовое письмо, проверяет headers `spf/dkim/dmarc=pass` | 10 sec |

**TOTAL:** 5 минут.

Ручных действий: 3 OAuth-клика + 4 paste-действия в Gmail + 1 клик на verify-link + 1 клик Done.

---

## ICP

**Primary:** Serial solopreneurs / indie hackers 3-10 проектов.
- Технически подкован (знает DNS, SMTP)
- Gmail = основной ящик, переезжать не хочет
- Запускает новые проекты раз в 1-3 месяца
- Ценит время > $50/час

**Secondary (for white-label in future):** агентства, делающие лендинги под ключ.

---

## Pricing (MVP)

### Pay-per-setup (разовые платежи)
| SKU | Price | Details |
|---|---|---|
| 1 mailbox | **$5** | Single Send-As on your domain |
| 3 mailboxes | **$12** | Three Send-As on same domain (save $3) |

### Subscriptions
| SKU | Price | Details |
|---|---|---|
| Deliverability Monitoring | **$3/mo per domain** | Daily SPF/DKIM/DMARC checks + alerts |

### Бесплатно как часть платного mailbox
- **Aliases** (через Cloudflare Email Routing forwarding) — unlimited, не отдельный SKU.

### Убрано из v1 брифа
- 5 mailboxes + aliases tier ($25) — нет реальной скидки против индивидуальных
- Multi-domain dashboard ($15/mo) — личный кабинет и так бесплатный
- Done-for-you ($20) — не масштабируется, лучше фиксить UX чем делать костыль
- Freemium — нет, привлечет спамеров

### Future (post-MVP)
- **White-label $49/mo** для агентств (когда появятся первые агентства-клиенты)
- **Lemon Squeezy** для оплаты — Stripe недоступен в Казахстане

---

## Architecture — ключевые решения

### Brevo — **shared corporate account** (Model B)
**Решение:** все юзеры обслуживаются через ОДИН Brevo-аккаунт владельца проекта
(не просим юзера создавать свой).
- Их домены добавляются как sender domains в наш аккаунт через Brevo API
- Каждый получает свой DKIM + SMTP credentials в рамках общего аккаунта
- **User-flow:** юзер **не знает** что Brevo существует, 0 шагов с его стороны
- **Cost:** Brevo free tier на старте, апгрейд до Starter (~$29/mo) когда упрется
  в 300 писем/день лимит
- **Risks:** если заспамим — забанит весь аккаунт. Mitigation: rate-limits на
  нашей стороне, domain-level abuse detection

### Resend — **убран из стека**
Транзакционные письма MailKit (welcome, receipt, setup-done) теперь через Brevo
transactional API. Экономия: 1 сервис вместо 2, $0-20/мес, меньше env-переменных.

### Cloudflare — юзер подключает СВОЙ аккаунт
OAuth или manual API token. Его DNS зона, наши API calls от его имени.
Альтернатив нет — аналогов cross-vendor не существует.

### Gmail — юзер подключает СВОЙ Google аккаунт
OAuth с scopes `gmail.settings.sharing` (на Workspace будет работать), `gmail.readonly`
(для перехвата verification email), `gmail.send` (для тестового письма).

---

## Tech stack (MVP)

| Компонент | Технология |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| UI | Tailwind 4 + shadcn/ui |
| i18n | next-intl (EN default, RU secondary) |
| DB + Auth | Supabase (RLS enabled) |
| DNS | Cloudflare API (user-connected) |
| SMTP provider | Brevo API (shared account) |
| Transactional email | Brevo transactional API (одно место) |
| Gmail | Gmail API (user-connected OAuth) |
| Payments | Lemon Squeezy (EN + RU markets) |
| Hosting | Vercel |
| Domain | getmailkit.com |

---

## Cost structure (для owner)

| Стадия | Monthly | Что включено |
|---|---|---|
| Dev phase | $0 | все free tiers |
| Public launch | $20 | Vercel Pro (обязательно для commercial) |
| Scale (500+ users) | ~$65 | Vercel Pro + Supabase Pro + Brevo Starter |

**Никогда не платим:** Cloudflare (юзер подключает), Google Cloud OAuth (free tier достаточно).

---

## Launch strategy

### First 100 setups — бесплатно
Взамен — публичный отзыв на Product Hunt / Indie Hackers / X. Нужны kick-start
social proofs, не reviews-за-деньги.

### Money-back guarantee
Two-tier policy: automation-failure auto-refund (our backend setup fails
→ full refund автоматически в 24 часа, без запроса юзера) + 30-day
functional guarantee (email не работает после setup → full refund по
запросу в support). НЕ завязано на user pace в Gmail wizard step. Полный
текст и customer-facing формулировки в
[docs/GUARANTEE_POLICY.md](GUARANTEE_POLICY.md).

### Markets
- **EN:** Product Hunt cold launch + Indie Hackers + X/Twitter build-in-public
- **RU:** X/Twitter + Telegram каналы (нет PH-эквивалента в рунете)

### Что НЕ делаем для MVP
- Lead magnets (Email Audit tool) — scope creep, другой user intent; SEO/audit =
  отдельная инициатива в v2
- SEO-контент «как настроить почту» — после первых 100 платящих

---

## Roadmap v2 (post-MVP)

### Chrome Extension для Gmail-шага
- Content script автозаполняет Gmail Settings → Send-As форму
- После единоразовой установки extension, Gmail-шаг сокращается с **3 мин до ~20 сек**
- **Dev эффорт:** 2-3 недели (Manifest v3, content script, tests)
- **Блокер до разработки:** юридический research + Terms of Service review (Chrome
  Store может отклонить за нарушение UX-intent)
- **Trigger для старта:** жалобы на 3-минутный Gmail-шаг от реальных юзеров, не
  гипотетические

### Workspace-сегмент (Path B)
- Отдельный flow для Google Workspace админов (domain-wide delegation)
- Полная автоматизация sendAs.create
- Ценник выше (для агентств/SMB): $15-25/setup

### Deliverability monitoring (как апселл)
- Daily SPF/DKIM/DMARC checks per domain
- Alerts если запись сломалась / домен blacklisted
- $3/mo per domain subscription

---

## Honest positioning rules

- **Метрика автоматизации, когда спросят:** "We automate 100% of the technical
  complexity. You do 3 simple copy-paste actions." Все.
- **Говорим о времени:** 5 минут — верхняя граница реального user-journey, никакого «0 minutes» или «0 clicks»
- **Говорим о процессе:** «guided Gmail setup» а не «Gmail automation» — мы не
  автоматизируем, мы направляем
- **Guarantee:** two-tier — automation-failure auto-refund + 30-day
  functional guarantee. НЕ про user pace в Gmail шаге. Full policy:
  [GUARANTEE_POLICY.md](GUARANTEE_POLICY.md)

---

## Post-launch Support Model

### Что может сломаться post-setup

1. DKIM ротация в Brevo (раз в 6-12 мес)
2. Юзер сам сломал DNS при других изменениях
3. Brevo деактивировал sender domain (inactivity / ToS)
4. Gmail отозвал Send-As (редко)
5. Истек домен / смена регистратора
6. Brevo free tier лимит 300 emails/day исчерпан

Большинство — внешние события, не наши баги. Но юзер приходит к нам.

### Модель поддержки (3 уровня)

**Уровень 1. 30-day guarantee (free, all users)**
- Любая поломка в первые 30 дней после покупки = free fix
- Покрывает: наши баги, раннюю DKIM-пропагацию, любые claim'ы юзера
- Цена нам: ~0, реальных обращений <2%

**Уровень 2. Self-serve diagnostic (free, forever)**
- Кнопка "Re-verify my setup" в дашборде юзера
- Автопроверка: MX, SPF, DKIM, DMARC, Send-As status, Brevo domain status
- Вывод: green/yellow/red по каждому пункту + конкретные next steps
- 90% проблем юзер решает без тикета

**Уровень 3. Paid re-setup & support (after 30 days)**

| SKU | Price | Use case |
|---|---|---|
| One-click Re-setup | $3 | Автоматический re-run pipeline (DKIM ротация, DNS восстановление) |
| Manual debug & fix | $10 | Когда Re-setup не помог, сложный кейс |
| Monitoring subscription | $3/mo | Unlimited re-setups + proactive alerts |

**Natural upsell:** юзер с поломкой через полгода выбирает между $3 разово
или $3/мес подпиской. ~30-40% конвертируются в подписку.

### Support channel

**Single channel: email `support@getmailkit.com`**
- Async, SLA 24h
- Owner отвечает лично до ~500 юзеров
- После этого — Claude-powered auto-responses для типовых кейсов
- No live chat, no phone (too expensive for $5 product)

**Expected load at MVP scale (first 500 users):** 2-4 тикета/неделю.

### ToS clause (legal protection)

В Terms of Service прописываем:

> "MailKit provides a one-time setup service. After 30 days from purchase,
> the setup is considered accepted. Subsequent DNS changes, provider
> migrations, or external outages are not covered by the base price.
> For ongoing monitoring and auto-fixes, subscribe to Monitoring at $3/mo."

### Dev implications

Новый **Ticket #8: Self-serve diagnostics & re-setup flow.**
- Dashboard кнопка "Verify my setup"
- Reuse setup pipeline code для re-verify
- One-click re-setup с Lemon Squeezy payment ($3)
- Email template для failure notifications (подготовка к monitoring)

Dev effort: 3-5 days после основного MVP. Окупается с 1-го re-setup платежа.

---

## Links

- Spike findings: [SPIKE_FINDINGS.md](SPIKE_FINDINGS.md)
- Marketing angles: [MARKETING_ANGLES.md](MARKETING_ANGLES.md)
- Tickets backlog: [TICKETS_BACKLOG.md](TICKETS_BACKLOG.md)
- Original v1 brief (pre-spike): [archive/PRODUCT_BRIEF_v1_pre_spike.md](archive/PRODUCT_BRIEF_v1_pre_spike.md)
- PR #1 (spike merged): https://github.com/borisk85/mailkit/pull/1
