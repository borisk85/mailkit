# MailKit — Competitor Research

Исследование проведено 2026-04-30. Обновлено 2026-06-12. Источник: веб-поиск через Claude agent.

---

## Прямые конкуренты (та же механика)

### SendMailAs (sendmailas.com) — ЕДИНСТВЕННЫЙ ПРЯМОЙ КОНКУРЕНТ

**Что делает:** автоматизирует настройку Cloudflare Email Routing + Gmail Send-As.
Использует собственный SMTP relay (не Postmark).

**Ключевые факты:**
- Тоже требует Cloudflare DNS — аудитория идентична
- Модель: подписка $29/год (по состоянию на июнь 2026 — "regular $69/yr" убрали, осталось просто $29/yr)
- Setup ~5 мин автоматически + ~2 мин ручной Gmail шаг
- Бесплатный tier: 1 домен, 2 адреса

**Критичное отличие MailKit vs SendMailAs:**
- SendMailAs: пользователь завязан на их SMTP relay — перестал платить → перестал отправлять
- MailKit: one-time $5 → юзер владеет стеком (Cloudflare free + Postmark free tier) независимо от нас навсегда

**Messaging angle против SendMailAs:**
> "Не подписка — ваш стек. После настройки MailKit инфраструктура ваша. Никаких ежегодных платежей, никакой зависимости от нашего сервиса."

---

## Альтернативы (другая механика, та же цель — custom email в Gmail)

| Продукт | Цена | Модель | Ключевое отличие |
|---|---|---|---|
| Google Workspace | $7/user/мес ($84/yr) | Подписка | Заменяет Gmail, не дополняет |
| ImprovMX | $9/мес | Подписка | Forwarding + SMTP, зависишь от них |
| ForwardEmail | $3/мес | Подписка | Open-source, forwarding + SMTP |
| Zoho Mail | бесплатно / $1.25/мес | Подписка | Заменяет Gmail, web-only бесплатный |

---

## Новое на рынке (июнь 2026)

### Cloudflare Email Service (private beta, сентябрь 2025)
Unified send+receive через Cloudflare Workers API. Developer tool — SPF/DKIM/DMARC конфигурируется автоматически через Workers bindings. **Не конкурент**: требует кода, ориентирован на разработчиков, не SMB.  
Следить: если выйдет consumer UI — прямая угроза.

### Google POP3 deprecation (2026)
Google объявил отключение POP в Gmail. Часть DIY-методов через POP3 сломается. **Для нас плюс**: наш стек (SMTP relay через Postmark) POP3 не использует, не затронут. Часть пользователей потеряет работающий DIY и будет искать замену.

### Рост DIY-гайдов по нашему стеку
В 2026 появились статьи именно про Cloudflare+Postmark+Gmail как бесплатный DIY. Конкурируют за ключевики ("cloudflare email brevo gmail"), но подтверждают спрос на этот стек.

---

## Вывод

Прямых конкурентов с моделью one-time payment + Cloudflare + Postmark + Gmail — **нет**.
SendMailAs — ближайший, но subscription и свой SMTP relay = vendor lock-in.

**Таблица сравнения нужна** — SendMailAs + Workspace + ImprovMX как основные reference points.
Реализовать через `/compare` страницу (stub уже создан, дизайн — по образцу agent-builder-saas).

---

## Позиционирование MailKit относительно конкурентов

- vs Workspace/Zoho: "Они заменяют Gmail. Мы его дополняем — ты остаёшься в привычном инбоксе."
- vs ImprovMX/ForwardEmail: "Они берут каждый месяц. Мы — один раз. Твоя инфраструктура, не наша."
- vs SendMailAs: "Они — ежегодная подписка, ты зависишь от их relay. Мы — $5 один раз, дальше Cloudflare и Postmark работают без нас."
