# MailKit — Marketing Angles

База для landing copy, ads, Product Hunt description, социальных постов.
Все цифры и фразы — с честной математикой, без маркетинговых натяжек.

## Категория продукта — критично для позиционирования (2026-04-30)

Поскольку имя "MailKit" совпадает с зарегистрированным брендом Mailkit
s.r.o. (чешская email marketing platform с 2006 года), мы должны
строго отделять нашу категорию продукта от их категории на всех
маркетинговых поверхностях.

**МЫ ЕСТЬ — email setup automation tool.**

**МЫ НЕ ЕСТЬ — email marketing platform / ESP / transactional email
service / email infrastructure platform.**

Эта категориальная разница снижает trademark confusion likelihood
если когда-нибудь возникнет вопрос. Mailkit s.r.o. защищён в категории
email-маркетинга — мы не пересекаемся с этой категорией ни услугой,
ни описанием.

**Запрещённые слова в копи и SEO targeting:**

- email marketing
- email campaigns
- newsletter platform
- email service provider / ESP
- transactional email service
- bulk email
- email blast
- email automation (без уточнения "setup automation")
- mailing list management
- email infrastructure platform

**Разрешённые и приоритетные ключевые фразы:**

- email setup automation
- Cloudflare Email Routing setup
- domain email automation
- Gmail Send-As setup wizard
- automated DNS configuration for email
- professional email on your domain (без слова "platform")
- DNS-free email setup
- email setup without DNS headaches
- one-click email forwarding
- automated MX/DKIM/SPF setup

## SEO target keywords (приоритет для блога и ranking)

Эти запросы — наши уникальные, минимальная конкуренция с Mailkit s.r.o.:

- "Cloudflare Email Routing setup" — основной target
- "Gmail Send-As automation" — высокий intent
- "how to set up email on Cloudflare domain"
- "free email forwarding for custom domain"
- "set up business email on personal domain"
- "Cloudflare Email Routing vs ImprovMX" — comparison content
- "Cloudflare Email Routing tutorial"
- "Send email from custom domain through Gmail"
- "how to use my own domain in Gmail"
- "professional email without Google Workspace"

**Запросы которые НЕ таргетируем** (это территория Mailkit s.r.o.):

- "email marketing platform"
- "email service provider"
- "transactional email API"
- "email deliverability service"
- "email infrastructure"
- "bulk email service"

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

## Core value prop (updated 2026-04-29 — repositioning от скорости к снятию боли)

**EN:** "Professional email on your domain — without the DNS headache.
We set up Cloudflare and Amazon SES for you. You keep using your
regular Gmail."

**RU:** "Профессиональная почта на твоём домене — без часа возни с
настройками. Cloudflare и Amazon настраиваем мы. Ты пользуешься своим
обычным Gmail."

## Стратегический сдвиг позиционирования (2026-04-29)

**Было:** "Под 10 минут полный setup". Скорость как core value.

**Стало:** "Снятие страха разобраться самому, гарантия что не сломаешь,
упрощение технического процесса". Скорость как side benefit, не центральная.

**Почему сменили.** Email setup — не задача "сделать срочно". Юзер может
терпеть часы или сутки на ожидании. Конкурировать с DIY на скорость
бессмысленно — технически грамотный юзер сделает сам если ему важна
скорость. Реальная боль не в скорости, а в:
- "Не понимаю как настроить DNS, SMTP, DKIM"
- "Боюсь что-то сломать"
- "Не хочу тратить вечер на гайды и форумы"
- "Хочу гарантию что результат работает"

Новое позиционирование решает эти боли напрямую.

## Time mentions — финальная политика (updated 2026-04-29 v3)

**На основе research данных AWS DKIM verification:** типичный случай
2-15 минут (большую часть времени — несколько минут). Обычный диапазон
до 1 часа. Долгий хвост (часы) — обычно конфиг-ошибки, у нас их нет
потому что записи пишутся автоматически без опечаток и без proxy.

**В Hero используем "за 30 минут":** покрывает 90% случаев, оставшиеся
10% обрабатываются через async email notification (юзер не сидит на
странице, мы пишем когда готово — для него это не overrun, а нормальный
flow с уведомлением).

**Hero EN:** "Email on your domain in 30 minutes — without the DNS headache."
**Hero RU:** "Почта на твоём домене за 30 минут — без часа возни с DNS."

**В FAQ полная честная разбивка:**

| Этап | Время |
|---|---|
| Активная работа в нашем мастере (вход, токен, имя ящика) | 7-10 мин |
| Проверка домена на стороне Amazon (мы ждём за тебя) | 2-15 мин типично, до 30 мин в обычной ситуации |
| Финальный шаг в Gmail Settings (копи-паст) | 3 мин |
| **Активного времени юзера** | **~10 мин максимум** |
| **Полное wall clock время** | **15-30 мин в 90% случаев** |

**Tail case (>30 минут, ~10% случаев):** AWS иногда замедляется. В этом
случае мы продолжаем мониторить статус автоматически и пишем email
сразу как только готово — юзер не блокирован, не сидит на странице,
не теряет время. Worst case описан в FAQ как "иногда до 1 часа в редких
случаях".

**На лендинге явно прописано:**
- "10 минут твоего активного времени"
- "Остальное — на стороне Amazon, мы пишем email когда готово к финалу"
- "В 90% случаев всё готово за 30 минут"

Async ожидание — стандартный паттерн в email-индустрии (Stripe, Twilio,
любой email provider).

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

## Tagline candidates (для A/B на лендинге — updated 2026-04-29 v2)

**Ключевая правка v2:** убираем фокус на скорость ("под 10 минут"), переходим
на снятие боли разбираться самому. Скорость не main selling point — для
этой аудитории она не имеет ценности.

EN:
- "Professional email on your domain — without the DNS headache."
- "Stop fighting DNS, SMTP, and DKIM. We set it up. You use Gmail as usual."
- "Your domain. Your Gmail. We handle the technical part. (Cloudflare DNS users.)"

RU:
- "Профессиональная почта на твоём домене — без часа возни с настройками."
- "Не разбираешься в DNS, SMTP, DKIM? И не нужно — мы это знаем."
- "Твой домен. Твой Gmail. Технику берём на себя. (Для пользователей Cloudflare DNS.)"

**Deprecated (use as historical reference only):**
- "Email on your Cloudflare domain in under 10 minutes" — скорость как
  main selling point оказалась слабым позиционированием. Обновлено
  2026-04-29 после рефлексии: для не-технического SMB важна не скорость,
  а уверенность в результате и снятие страха технической сложности.

## Launch promo

**Product Hunt launch:** первые 25 setups бесплатно в обмен на публичный
отзыв. Формулировка: "Launch Week Special: First 25 mailboxes free,
just tell us how it went."
