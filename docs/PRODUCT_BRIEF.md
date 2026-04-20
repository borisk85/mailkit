# MailKit — Product Brief

Version: v2 (post-spike, post-strategy 2026-04-20 evening)
Status: MVP scoped, scaffold in progress
Predecessor: [archive/PRODUCT_BRIEF_v1_pre_spike.md](archive/PRODUCT_BRIEF_v1_pre_spike.md)

---

## Tagline

**EN:** Email on your domain in 4 minutes, guaranteed. Skip 30 minutes of DNS hell.

**RU:** Почта на домене за 4 минуты. С гарантией что все работает. Без 30 минут возни с DNS.

### Не говорим никогда
«0 clicks», «full auto», «90% automation», «zero setup» — это натяжка. Реальность:
мы автоматизируем 100% технической сложности, юзер делает 3 простых copy-paste
действия и один клик в Gmail. Это честная формулировка.

---

## Суть продукта

SaaS для автоматической настройки корпоративной почты `hello@yourdomain.com`
в существующем Gmail. Убираем боль ручного DNS, SMTP и Send-As setup —
юзер получает готовый почтовый адрес за 4-5 минут вместо 30-45.

---

## Product strategy

### Path A — MVP (Hybrid)
**Для кого:** indie hackers, solopreneurs на личном Gmail.
**Что делаем:**
- Cloudflare Email Routing + DNS (MX/SPF/DKIM/DMARC) — полностью автоматом через API
- Brevo sender domain + DKIM + SMTP creds — полностью автоматом через API (на нашем shared аккаунте)
- Gmail Send-As — guided UI-wizard: juзер копирует SMTP host/port/username/password в Gmail Settings (deep link), получает verification email, кликает ссылку
**Time to setup:** 4-5 минут
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

**TOTAL:** 4-5 минут.

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
Не уложились в 5 минут — вернули деньги. Дешево, подчеркивает бренд-обещание.

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
- **Говорим о времени:** 4-5 минут, а не «5 минут» и не «0 minutes» — честно
- **Говорим о процессе:** «guided Gmail setup» а не «Gmail automation» — мы не
  автоматизируем, мы направляем
- **Guarantee:** деньги назад если дольше 5 минут — подтверждает обещание делом

---

## Links

- Spike findings: [SPIKE_FINDINGS.md](SPIKE_FINDINGS.md)
- Original v1 brief (pre-spike): [archive/PRODUCT_BRIEF_v1_pre_spike.md](archive/PRODUCT_BRIEF_v1_pre_spike.md)
- PR #1 (spike merged): https://github.com/borisk85/mailkit/pull/1
