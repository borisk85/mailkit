# MailKit — Email на домене за $5

SaaS для автоматической настройки корпоративной почты на своем домене через Gmail.

Статус: идея, подготовка к feasibility-спайку. Зафиксировано 2026-04-20.

---

## 1. Суть продукта

Подключи домен и Gmail — через 5 минут у тебя работает `hello@твой-домен.kz`: прием писем в Gmail + отправка из Gmail с этого адреса. Без ручной возни с DNS, SMTP и Send-As.

### Tagline

> $1-5 за настройку почты на домене. Один OAuth и готово за 5 минут.

---

## 2. Проблема

Каждый соло-фаундер при запуске нового проекта проходит один и тот же ад:
- Cloudflare Email Routing — домен, DNS-записи, routing
- Brevo / Resend / SES — верификация домена, DKIM, SMTP-credentials
- Gmail Settings → Send mail as — вручную SMTP, код верификации
- Gmail Signature — собрать, вставить, привязать

30+ минут даже если делал 5 раз. Три разных UI, три терминологии.

### Validation evidence

Boris прошел настройку `hello@vibecraft.kz` 2026-04-19 — это был его 5-й раз за последние 2 года. Через 1 час после завершения — уже не помнит шаги. Задача слишком фрагментирована между 3-4 системами чтобы автоматизироваться в голове. Значит всегда будет боль, всегда будет готовность заплатить за пропуск.

### Конкретный пример ловушки

В Brevo для Gmail Send-As:
- SMTP login — НЕ твой email, а специальный `a64692001@smtp-brevo.com`
- SMTP password — НЕ пароль от Brevo, а отдельный SMTP key `xsmtpsib-...`

Gmail не подсвечивает ошибку — просто «не могу подключиться», 30 минут кручения.

---

## 3. ICP (целевой клиент)

**Основной:** Serial solopreneur / indie hacker с 3-10 проектами.
- Технически подкован (знает DNS, SMTP, OAuth)
- Ценит время > $50/час
- Gmail = основной ящик, переезжать не хочет
- Запускает новые проекты раз в 1-3 месяца

**Вторичный:** Агентства и фрилансеры, которые делают лендинги клиентам под ключ и включают настройку почты как часть сервиса.

---

## 4. User flow — 5 минут

1. Регистрация — OAuth Google (один клик)
2. Connect Cloudflare — OAuth или API token (один клик)
3. Выбрать домен из списка Cloudflare-зон
4. Ввести адрес — `hello@mydomain.kz`
5. Platform делает за кадром:
   - Cloudflare Email Routing
   - Домен в Brevo/Resend
   - DNS-записи через Cloudflare API (MX, SPF, DKIM, DMARC)
   - Gmail API: Send-As + SMTP-credentials
   - Автоперехват кода верификации из inbox
   - Подпись (шаблон или кастомная)
6. Готово — тестовое письмо

Ручных действий: 0 после 2 OAuth-кликов.

---

## 5. Бизнес-модель

### Основная: Pay-per-setup

| Что | Цена |
|---|---|
| 1 email-адрес на домене | $5 |
| Bundle: 3 ящика на одном домене | $12 |
| Bundle: домен + 5 ящиков + алиасы | $25 |

### Апселы

| Апсел | Цена | Для кого |
|---|---|---|
| Deliverability monitoring | $3/мес за домен | Кто шлет письма в объеме |
| Multi-mailbox / multi-domain | $15/мес | Фаундеры с 10+ проектами |
| Custom email signature editor | $10 разово | Все |
| White-label для агентств | $49/мес | Агентства (вход в SMB) |

### Unit-экономика

- Себестоимость настройки: ~$0.10-0.20
- Gross margin: ~95-98%
- LTV multi-domain юзера: $100-200 (10-15 setup за 2 года + monitoring + multi-mailbox)

### Прогноз

| Период | Выручка | За счет чего |
|---|---|---|
| Year 1 | $10-30K | Indie hackers, dogfood Vibecraft |
| Year 2 | $80-150K | White-label агентства |
| Year 3 | зависит от B2B | Масштаб white-label |

---

## 6. Конкуренты

| Сервис | Что делает | Чего не хватает |
|---|---|---|
| Forward Email | Inbound forward + SMTP | Не автоматизирует Gmail Send-As, DNS вручную |
| ImprovMX | Forwarding + SMTP | Всё равно ручные клики, подписка |
| Maildoso / Mailforge | SPF/DKIM/DMARC для cold email | $100+/мес, не для indie |
| Resend | Cloudflare Domain Connect | Только отправка, нет приема, нет Gmail |
| Zoho / Google Workspace | Свой ящик | Заменяют Gmail, не дополняют |

**Вывод:** никто не делает полный цикл Cloudflare + SMTP + Gmail Send-As в одном OAuth за $5. Pay-per-setup модели нет ни у кого.

**Fiverr signal:** гиг «email setup $10 one-time» существует и покупается.

---

## 7. Позиционирование

1. **Pay-per-setup, не подписка** — единственный в категории
2. **Gmail-centric** — не заменяем Gmail, дополняем
3. **Indie-hacker ICP** — не cold-email платформы
4. **Cross-vendor orchestration** — Cloudflare + SMTP + Gmail одновременно
5. **White-label** — вход в SMB через агентства, не напрямую

---

## 8. Go-to-Market

1. **Twitter/X indie community** — dogfooding, build-in-public
2. **SEO** — «как настроить почту на домене» (десятки тысяч запросов/мес)
3. **Product Hunt + Indie Hackers launch** — первые 100 бесплатно за фидбек
4. **Партнерства** — регистраторы (ps.kz, Namecheap), Cloudflare apps

---

## 9. Технический стек (MVP)

| Компонент | Технология |
|---|---|
| Frontend | Next.js + Tailwind + shadcn/ui |
| Backend | Next.js API Routes |
| БД | Supabase |
| Auth | Supabase Auth (magic-link) |
| DNS | Cloudflare API |
| SMTP | Brevo (MVP), Resend (v2) |
| Gmail | Gmail API (Send-As, messages.list) |
| Платежи | Stripe + Lemon Squeezy |
| Email | Resend |
| Хостинг | Vercel |

---

## 10. Риски

| Риск | Оценка | Митигация |
|---|---|---|
| Google OAuth verification | Средний | 2-4 недели, подавать первым шагом |
| Google отказ в OAuth | Низкий | Fallback: app passwords (UX хуже, но работает) |
| Brevo/Resend terms (резелл) | Средний | Юзер создает свой SMTP через нашу автоматизацию от его имени |
| Cloudflare встроит фичу | Низкий | Быстрый go-to-market, расширение на multi-provider |
| Маленький рынок indie | Средний | White-label для агентств = x100 рынок |

---

## 11. MVP scope

- Только Cloudflare + Brevo + Gmail (один стек)
- Английский язык (rest-world market)
- Один flow: create → verify → done
- Без monitoring (апсел после 50 платящих)
- Stripe для оплаты
- Landing + demo-видео

**Срок MVP:** 3-4 недели код + 2-4 недели OAuth = ~2 месяца до первого юзера

---

## 12. Следующие шаги

1. **Feasibility-спайк** — Python скрипт end-to-end через API (один вечер)
2. **Подать Google OAuth заявку** — до написания кода (10 минут)
3. **Валидация** — пост на X/Indie Hackers: «Would you pay $5 to skip email setup?»
4. **Домен** — зарегистрировать (mailkit.app / kitmail.io / setup.email)
5. **MVP** — только после шагов 1-3

---

## Связанные проекты

- **Vibecraft** (vibecraft.kz) — агентство, первый клиент MailKit (dogfood)
- **VELA** (velabot.io) — SaaS в хобби-режиме, email setup через Brevo
- **Vibeaudit** — бесплатный лид-магнит, бриф в C:\Claude Code\Vibeaudit\BRIEF.md
