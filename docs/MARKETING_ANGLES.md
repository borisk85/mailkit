# MailKit — Marketing Angles

База для landing copy, ads, Product Hunt description, социальных постов.
Все цифры и фразы — с честной математикой, без маркетинговых натяжек.

## Core value prop

**EN:** "Email on your domain in 5 minutes. Skip 90 minutes of DNS hell,
Brevo gotchas, and Gmail setup dance."

**RU:** "Почта на домене за 5 минут. Без часа возни с DNS, граблей Brevo
и танцев с Gmail Send-As."

## Time comparison (actual)

| Scenario | Inexperienced user | Experienced but forgetful |
|---|---|---|
| Fully manual (2026 reality with ChatGPT help) | 60-90 min | 45-60 min |
| With MailKit MVP | 5 min | 5 min |
| With MailKit + Extension (v2) | ~1.5 min | ~1 min |

Time savings MVP: 90%+
Time savings with Extension: 97%+

## Why ChatGPT/Claude isn't a real fix

Это отдельный убойный angle. Юзер может подумать "зачем MailKit, у меня
есть ChatGPT" — надо развенчать.

1. **Stale UI knowledge** — LLM помнят интерфейсы сервисов на момент
   тренировки. Brevo меняет UI каждые 3-6 мес. Cloudflare тоже. Юзер
   получает устаревшие инструкции, застревает, возвращается в чат.
2. **Back-and-forth friction** — скриншоты, уточняющие вопросы, чат
   разрастается до 50+ сообщений за одну настройку.
3. **Context loss** — через 20 минут юзер не помнит на каком он шаге,
   пролистывает чат, теряется.
4. **No execution** — LLM объясняет КАК делать, но не делает ЗА юзера.
   Ошибки юзера (опечатки в DNS, пропущенные поля) — на его стороне.
5. **Multiple services** — каждый сервис требует своего "режима помощи"
   у LLM. Переключение контекста = потеря времени.

**Итог:** ChatGPT + MailKit = комплементы. ChatGPT объясняет что такое
SPF/DKIM. MailKit реально все настраивает.

## Core pains we eliminate

В порядке приоритета:

1. **Brevo SMTP confusion** — API key ≠ SMTP credentials, юзеры путают
   и теряют 15-20 мин. MailKit знает и берет правильные.
2. **DNS записи точные** — один символ не так в SPF/DMARC = не работает.
   Ручной ввод = источник 80% ошибок. Мы генерим и прописываем сами.
3. **Порядок действий** — 3 сервиса в определенной последовательности,
   одна ошибка = откат назад. Мы знаем правильный порядок.
4. **Gmail Send-As dance** — копировать SMTP точно, дождаться письма,
   кликнуть линк. Мы ведем пошагово, ловим verify автоматически.
5. **Retries и fallback** — если DKIM не верифицируется с первой попытки,
   LLM скажет "подождите". Мы автоматически ретраем с backoff.

## Audience segments (для таргетинга рекламы)

**Primary — Serial Indie Hackers:**
- Pain: "запускаю новый проект раз в месяц, каждый раз email-ад"
- Hook: "Your 10th side project. Your 1st 5-min email setup."
- Channels: X/Twitter, Indie Hackers, Product Hunt

**Secondary — Agency owners / Freelancers:**
- Pain: "делаю клиентам лендинги, настройка почты ест время"
- Hook: "Ship email setup as part of your deliverable. 5 minutes each."
- Channels: X, LinkedIn, агентские Telegram-чаты (RU)

**Tertiary — Non-tech founders:**
- Pain: "не программист, боюсь что-то сломать в DNS"
- Hook: "No DNS knowledge required. We handle the technical part."
- Channels: SMB blogs, Product Hunt

## Objection handling (готовые ответы)

| Возражение | Ответ |
|---|---|
| "Это все бесплатно можно самому сделать" | "Да. За час-полтора. Наш продукт — 5 минут. $5 за 60 минут твоего времени — выгодно." |
| "У меня есть ChatGPT" | "ChatGPT объяснит теорию. Но клики делать все равно тебе. Мы делаем за тебя." |
| "Почему не Zoho / Google Workspace?" | "Они ЗАМЕНЯЮТ Gmail. Мы его ДОПОЛНЯЕМ. Ты остаешься в привычном инбоксе." |
| "3-минутный Gmail-шаг — это не полная автоматизация" | "Честно: 70% шагов авто, 100% технической сложности авто. Ты не путаешься в SPF/DKIM — делаешь 3 клика copy-paste под guide." |
| "Что если сломается потом?" | "Monitoring $3/мес: мониторим ежедневно, алертим если что." |

## Tagline candidates (для A/B на лендинге)

EN:
- "Email on your domain in 5 minutes. Guaranteed."
- "Skip 90 minutes of email setup hell."
- "Your 10th project. Your 1st 5-min email setup."

RU:
- "Почта на домене за 5 минут."
- "Пропусти час возни с DNS."
- "Десятый проект. Первая быстрая настройка почты."

## Launch promo

**Product Hunt launch:** первые 100 setups бесплатно в обмен на публичный
отзыв. Формулировка: "Launch Week Special: First 100 mailboxes free,
just tell us how it went."
