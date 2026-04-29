# MailKit — Marketing Angles

База для landing copy, ads, Product Hunt description, социальных постов.
Все цифры и фразы — с честной математикой, без маркетинговых натяжек.

## Audience scope (updated 2026-04-29)

**ТОЛЬКО пользователи у которых домен на Cloudflare DNS.** Внутри этой
группы фокус на не-технических SMB которые попали на Cloudflare через
free tier маркетинг (DDoS защита, бесплатный CDN), но не имеют навыков
настраивать Email Routing + DKIM/SPF/DMARC + SMTP сами.

Технических CF-юзеров (developers, sysadmins) маркетинг не таргетирует —
они сделают сами. Тратить marketing-budget на них = потеря.

Юзеры не на Cloudflare DNS — НЕ наша аудитория для launch'а. Им явно
говорим: "MailKit currently requires Cloudflare DNS. Migrate first
(free, ~30 min), then setup takes under 10 minutes."

## Core value prop

**EN:** "Email on your Cloudflare domain in under 10 minutes. We
configure Email Routing, Brevo SMTP, and DNS records — you do the
3-minute Gmail Send-As wizard."

**RU:** "Почта на твоём домене с Cloudflare — под 10 минут. Настраиваем
Email Routing, Brevo SMTP, DNS-записи. Ты делаешь 3-минутный мастер
Gmail Send-As."

## Time comparison (actual, updated 2026-04-29)

| Scenario | Inexperienced CF user | Experienced CF user |
|---|---|---|
| Fully manual (2026 reality with ChatGPT help) | 60-90 min | 45-60 min |
| With MailKit MVP (CF DNS already setup) | 8-12 min | 6-8 min |
| With MailKit + Extension (v2) | ~3-5 min | ~2-3 min |

Time savings MVP: 80-85% для не-технических CF юзеров.

(Старая таблица "5 минут" deprecated 2026-04-29 — не учитывала login
в Cloudflare, генерацию API token, copy-paste SMTP полей в Gmail.)

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

## Audience segments (для таргетинга рекламы — narrowed 2026-04-29)

**ВСЕ сегменты ниже фильтруются по одному условию: домен на Cloudflare
DNS.** Не-CF юзеры — не наша аудитория для launch'а.

**Primary — Non-tech CF users (free tier converts):**
- Pain: "у меня домен на Cloudflare для DDoS защиты, хочу почту на нём,
  но Email Routing + Brevo + Gmail Send-As — слишком сложно"
- Hook: "Cloudflare уже работает. Email — ещё проще, под 10 минут."
- Channels: r/cloudflare, Cloudflare community forums, comparison
  searches "Cloudflare Email Routing vs ImprovMX"
- Это наш ключевой сегмент по market research — 40-45% CF юзеров

**Secondary — Indie Hackers (CF DNS users):**
- Pain: "запускаю новый проект раз в месяц, каждый раз email-ад"
- Hook: "Your 10th side project. Your 1st 8-min email setup."
- Channels: X/Twitter, Indie Hackers, Product Hunt

**Secondary — Agency owners / Freelancers:**
- Pain: "делаю клиентам лендинги, настройка почты ест время"
- Hook: "Ship email setup as part of your deliverable. 5 minutes each."
- Channels: X, LinkedIn, агентские Telegram-чаты (RU)

**Tertiary — Non-tech founders:**
- Pain: "не программист, боюсь что-то сломать в DNS"
- Hook: "No DNS knowledge required. We handle the technical part."
- Channels: SMB blogs, Product Hunt

**Quaternary — SMB owners (shops, services, consultants):**
- Pain: "хочу info@mybiz.com для профессионализма в переписке с клиентами,
  но Google Workspace $6/мес на человека — лишние деньги"
- Hook: "Professional email on your domain for $5 one-time. Without the
  monthly Workspace subscription."
- Channels: SMB Facebook groups, LinkedIn, Reddit r/smallbusiness, RU —
  VK groups, Telegram каналы для предпринимателей
- Важно: для них нужны **реальные Gmail screenshots** на 6-шагов wizard
  (не только schematic diagrams) — они боятся запутаться в Gmail UI.
  Tech debt в TICKETS_BACKLOG.md.

**Quinary — Non-English entrepreneurs (RU и другие):**
- Pain: "RU SMB — Google Workspace overkill по цене, но хочу domain email"
- Hook: "Почта на твоём домене с Cloudflare — под 10 минут. Гарантия возврата."
- Channels: VK, Telegram, RU entrepreneur communities
- Важно: tone of voice на русском — не переведенный EN маркетинг, а
  native-copy с учетом локальных expectation'ов. Русский SMB больше
  нуждается в "мы держим тебя за руку" tone'е, меньше — в indie-hacker
  шорткат-vibe'е.

## Objection handling (готовые ответы)

| Возражение | Ответ |
|---|---|
| "Это все бесплатно можно самому сделать" | "Да. За час-полтора. Наш продукт — 5 минут. $5 за 60 минут твоего времени — выгодно." |
| "У меня есть ChatGPT" | "ChatGPT объяснит теорию. Но клики делать все равно тебе. Мы делаем за тебя." |
| "Почему не Zoho / Google Workspace?" | "Они ЗАМЕНЯЮТ Gmail. Мы его ДОПОЛНЯЕМ. Ты остаешься в привычном инбоксе." |
| "3-минутный Gmail-шаг — это не полная автоматизация" | "Честно: 70% шагов авто, 100% технической сложности авто. Ты не путаешься в SPF/DKIM — делаешь 3 клика copy-paste под guide." |
| "Что если сломается потом?" | "Monitoring $3/мес: мониторим ежедневно, алертим если что." |
| "А если у вас автоматика не сработает?" | "Автоматический refund в 24 часа, без запроса. Мы видим сбой, возвращаем деньги сами. См. /guarantee." |
| "А если через неделю перестанет работать?" | "30-дневная функциональная гарантия. Напиши в support — починим или вернем деньги полностью." |

## Tagline candidates (для A/B на лендинге — updated 2026-04-29)

**Ключевая правка:** все taglines теперь явно указывают на Cloudflare
audience и используют "under 10 minutes" вместо "5 minutes".

EN:
- "Email on your Cloudflare domain in under 10 minutes. Guaranteed."
- "Cloudflare DNS user? Skip 60 minutes of email setup hell."
- "Your domain. Your Gmail. Under 10 minutes. (Cloudflare DNS users only.)"

RU:
- "Почта на твоём Cloudflare-домене — под 10 минут. С гарантией."
- "Cloudflare уже стоит? Пропусти час возни с DNS — настройка под 10 минут."
- "Твой домен. Твой Gmail. Под 10 минут. (Только для Cloudflare DNS.)"

## Launch promo

**Product Hunt launch:** первые 100 setups бесплатно в обмен на публичный
отзыв. Формулировка: "Launch Week Special: First 100 mailboxes free,
just tell us how it went."
