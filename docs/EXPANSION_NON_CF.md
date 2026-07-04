# Расширение линейки: email setup для не-CF доменов

**Статус:** backlog — отдельный продукт, не MailKit

MailKit остаётся CF-only. Для других DNS-провайдеров нужен другой forwarding backend — другой стек, другой бренд, отдельный запуск.

---

## Рынок (данные верифицированы, июнь 2026)

| Провайдер | Доля .com | API | Пригодность |
|---|---|---|---|
| Cloudflare DNS | ~15–20% всех сайтов | — | текущий MailKit |
| GoDaddy | ~31% .com | закрыт (10+ доменов или платный) | ❌ не подходит для single-domain |
| Namecheap | ~6.7% .com (~11M доменов) | открытый | ✅ |
| Porkbun | ~0.7% .com (~1.2M доменов) | открытый | ✅ |

Namecheap + Porkbun вместе: ~7.5% .com рынка.

Cloudflare DNS охватывает ~15–20% всех сайтов в мире (W3Techs) — это намного больше 4.8M (зарегистрированных через CF). Все домены с CF nameservers, независимо от регистратора, попадают в аудиторию MailKit.

---

## Почему GoDaddy не берём

С 2024 года Godaddy API требует 10+ доменов или платный membership. Single-domain SMB — это наша аудитория — отрезаны. Автоматизация нереальна без ручных шагов.

---

## Стек нового продукта (Namecheap/Porkbun)

- Email forwarding: **ImprovMX** или **Forward Email API** (вместо CF Email Routing — оно только для CF DNS)
- DNS API: Namecheap API + Porkbun API
- SMTP: Postmark (тот же backend — переиспользовать)

---

## Спрос подтверждён

Органический SEO-канал: люди гуглят "Namecheap domain + Gmail Send-As setup" и натыкаются на ручные гайды (Dev.to, форумы). Namecheap сам продаёт email hosting ($1.48–3.88/мес) — юзеры знают боль, хотят one-time вместо подписки.

---

## Старт нового продукта на базе MailKit

Форкнуть MailKit — самый быстрый путь. ~80% кода переносится без изменений.

**Переносится 1:1:**
- Auth (Supabase)
- Оплата (Lemon Squeezy)
- Дашборд и весь UI-кит
- Postmark SMTP + email-шаблоны
- Визард-скелет (структура шагов)
- БД-структура

**Нужно переписать (~20% кода):**
- CF Email Routing → ImprovMX или Forward Email API
- CF DNS API → Namecheap API + Porkbun API
- Шаги визарда под другой флоу провайдеров

---

## Вывод

Делать MailKit CF-only до стабильных продаж, потом форкнуть и запустить отдельный продукт под Namecheap/Porkbun. GoDaddy — не трогать.
