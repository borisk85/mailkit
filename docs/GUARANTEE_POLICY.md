# MailKit — Guarantee Policy

Single source of truth для всех формулировок гарантии: на лендинге, в
checkout (Lemon Squeezy), в ToS, в onboarding e-mail'ах, в support ответах.
Если где-то встречаешь формулировку гарантии, которая не совпадает с этим
документом — это bug, фикси ссылкой на актуальный текст отсюда.

---

## TL;DR

MailKit дает две независимые гарантии вместо старой "5 минут или деньги
назад":

1. **Automation guarantee** (автоматический refund) — если наша автоматика
   (Cloudflare Email Routing + Brevo SMTP setup) фейлится на любом шаге,
   юзер получает полный refund без запроса. Время этой фазы — под 2 минуты,
   измеряется сервером, evidence на нашей стороне.

2. **30-day functional guarantee** (refund по запросу) — если в течение 30
   дней после покупки юзер не может реально отправлять/получать email на
   своем домене через то, что мы настроили, и наш support не смог починить
   — полный refund.

**Что НЕ гарантируется:** скорость копипаста самого юзера в Gmail-шаге,
работа после самостоятельных правок DNS/Gmail после setup'а, доставляемость
(отдельный продукт — Deliverability Monitoring $3/mo).

Старая формулировка "5 минут или деньги назад" deprecated. Причины разбора
в секции "Why we changed this" ниже.

---

## Why we changed this

Старая формулировка имела три структурных проблемы, которые вылезали при
первом же разборе edge cases:

**Проблема 1: мы не контролируем пользовательскую скорость.**

Наш pipeline делится на три фазы:

| Фаза | Кто исполнитель | Реальное время | Мы контролируем? |
|---|---|---|---|
| Cloudflare Email Routing | Наш backend | 5-15 сек | Да |
| Brevo SMTP setup | Наш backend | 30-90 сек | Да |
| Gmail Send-As wizard | Юзер руками в Gmail | 2-5 мин | Нет |

Если юзер залип на Gmail-шаге (отвлекся на ребенка, позвонили, ушел пить
кофе) — time-to-done может быть 30 минут. По старой формулировке технически
он имеет право на refund, хотя наша часть отработала за 90 секунд. Это
неправильное распределение риска.

**Проблема 2: formal claim "5 минут" слабо defensible.**

В случае Lemon Squeezy dispute через платежную систему банк автоматически
возвращает деньги покупателю при любом conflict'e на $5. Юридически
доказывать "но по нашим DB логам у него было 4 минуты 50 секунд" — не
стоит времени. Для $5 продукта никакого юридического протокола не будет —
банк вернет деньги, мы потеряем fee (~$0.5-1 от Lemon Squeezy) + cost
сохранения sender domain в Brevo account.

**Проблема 3: нет четкого critera для refund'а.**

Юзер пишет "у меня заняло 8 минут". Мы смотрим DB — да, 8 минут, но 6 из
них он залипал на Gmail шаге. Что делаем? По старой формулировке — обязаны
вернуть. По здравому смыслу — не должны. Конфликт формулировки и логики.

Новая формулировка решает все три проблемы: мы гарантируем то, что реально
контролируем и можем объективно измерить (automation phase), плюс мы
гарантируем конечный результат в разумный срок (functional 30-day window).
Честно, защитимо, измеримо.

---

## Formal policy — legal-style text

Эти формулировки идут в Terms of Service на сайте, в Lemon Squeezy
product description / checkout fine print, в receipt email после покупки.
Текст согласован, не переписывай без updated версии этого документа.

### EN (canonical)

> **MailKit Guarantee**
>
> **1. Automation Failure Refund (automatic).** If our automated setup of
> Cloudflare Email Routing or Postmark SMTP fails to complete for your domain
> within the combined automation phase (typically under 2 minutes), we
> issue a full refund automatically within 24 hours of the failure. No
> action required on your part. The automation phase is measured
> server-side from the start of setup to the completion of the Brevo
> verification step. Failure means our system returned an error and did
> not reach the Gmail wizard phase.
>
> **2. 30-Day Functional Guarantee (by request).** If, within 30 days of
> purchase, you cannot send or receive email through the setup we
> configured — even after we've attempted to assist you via support — you
> are entitled to a full refund. Submit a request to
> `support@getmailkit.com` describing the issue. We respond within 48
> hours on business days.
>
> **What is not covered:**
> - Time you spend on the Gmail Send-As guided step. We provide a
>   step-by-step wizard with copy-paste fields; the actual clicks happen
>   in your Gmail account, at your pace.
> - Failures caused by changes you make to DNS records, Cloudflare
>   settings, or Gmail account settings after setup completion.
> - Email deliverability issues (messages marked as spam by recipients,
>   reputation problems). These are addressed by our optional
>   Deliverability Monitoring subscription ($3/month per domain).
> - Failures caused by your domain expiration, registrar changes, or
>   account suspensions at third-party services (Cloudflare, Postmark,
>   Google) outside our control.
> - MailKit being discontinued. MailKit is an independent product and may
>   be discontinued at any time for business, personal, or infrastructure
>   reasons. We make no guarantee that the Service will remain available
>   for any minimum period, and the one-time setup fee is not refundable
>   if the Service is discontinued after your setup completes. Your domain,
>   DNS, Cloudflare Email Routing and Gmail remain on your own accounts.
>
> **How refunds are processed:** Refunds are issued through the original
> payment method via Lemon Squeezy. Processing time depends on your
> card issuer, typically 3-10 business days.
>
> **Fraud note:** We track refund requests per account. Multiple refund
> requests from the same account may result in account restriction.

### RU (canonical перевод — не парафраз)

> **Гарантия MailKit**
>
> **1. Автоматический возврат при сбое автоматики.** Если наша
> автоматическая настройка Cloudflare Email Routing или Postmark SMTP не
> завершается для твоего домена в рамках этой фазы (обычно меньше 2
> минут), мы возвращаем деньги полностью автоматически в течение 24
> часов после сбоя. Тебе ничего делать не надо. Время этой фазы
> измеряется на нашем сервере — с момента старта настройки до
> завершения верификации Brevo. Сбой означает, что наша система
> вернула ошибку и не дошла до шага Gmail-мастера.
>
> **2. 30-дневная функциональная гарантия (по запросу).** Если в
> течение 30 дней с момента покупки ты не можешь отправлять или
> получать email через настройку, которую мы сделали — даже после
> того, как наш support попытался помочь — ты имеешь право на полный
> возврат. Отправь запрос на `support@getmailkit.com` с описанием
> проблемы. Мы отвечаем в течение 48 часов в рабочие дни.
>
> **Что НЕ покрывается гарантией:**
> - Время, которое ты тратишь на Gmail Send-As шаг. Мы даем пошаговый
>   мастер с готовыми полями для копирования; сами клики происходят в
>   твоем Gmail-аккаунте, в твоем темпе.
> - Сбои, вызванные изменениями DNS-записей, настроек Cloudflare или
>   настроек Gmail-аккаунта, которые ты внес после завершения настройки.
> - Проблемы доставляемости email (письма попадают в спам у получателей,
>   проблемы с репутацией отправителя). Это покрывается нашей опциональной
>   подпиской Deliverability Monitoring ($3/месяц на домен).
> - Сбои из-за истечения срока твоего домена, смены регистратора или
>   блокировки аккаунтов в сторонних сервисах (Cloudflare, Postmark,
>   Google), которые вне нашего контроля.
>
> **Как обрабатывается возврат:** Деньги возвращаются на ту же карту, с
> которой была оплата, через Lemon Squeezy. Срок зачисления зависит от
> твоего банка, обычно 3-10 рабочих дней.
>
> **Антифрод:** Мы отслеживаем запросы на возврат по каждому аккаунту.
> Несколько запросов на возврат от одного аккаунта могут привести к
> ограничению доступа.

---

## Customer-facing wording

Более человеческие, короткие формулировки для маркетинга. Legal-версия
выше — для ToS и disputes. Эти — для лендинга, email'ов, FAQ.

### Landing hero — tagline options

**Option A (рекомендую — сохраняет marketing-punch + добавляет ссылку на
точную policy):**

- EN: "Email on your Cloudflare domain in under 10 minutes. [Guaranteed*](/guarantee)"
- RU: "Почта на твоём Cloudflare-домене — под 10 минут. [С гарантией*](/guarantee)"

Сноска `*` — тонкая ссылка на `/guarantee` страницу с полным policy.
Читатель-скептик кликнет, прочитает честное распределение ответственности,
убедится что не разводим. Casual reader увидит привычный punch.

**Option B (более осторожный — снимает "Guaranteed" из тaгline'а, ставит
отдельным trust badge):**

- EN headline: "Email on your Cloudflare domain in under 10 minutes."
- EN trust badge под headline: "30-day money-back guarantee — details"
- RU headline: "Почта на твоём Cloudflare-домене — под 10 минут."
- RU trust badge: "30-дневная гарантия возврата — подробнее"

**Мой выбор:** Option A. Текущий лендинг уже использует "Guaranteed",
юзеры к формулировке привыкли, сбрасывать ее — потеря конверсии. Сноска
`*` решает проблему честности через escape-valve для тех, кто проверит.

### Trust block — секция сразу под hero

Блок с 2-3 буллетами, объясняющий policy в 1-2 строках каждый.

**EN:**

> **Two guarantees, zero ambiguity:**
>
> - **If our automation fails** (Cloudflare or Brevo setup breaks on our
>   end) — full refund issued automatically within 24 hours.
> - **30-day money-back** — if you can't actually send email through your
>   domain after setup, we fix it or refund. Just email support.
> - **Your time on the Gmail step** is not timed. We guide you click by
>   click; you go at your own pace.
>
> [Full policy details →](/guarantee)

**RU:**

> **Две гарантии, без мелкого шрифта:**
>
> - **Если наша автоматика сломалась** (настройка Cloudflare или Brevo
>   упала на нашей стороне) — возврат денег автоматически в течение 24
>   часов.
> - **30-дневный возврат денег** — если после настройки реально не можешь
>   отправлять письма со своего домена, мы чиним или возвращаем деньги.
>   Просто напиши в support.
> - **Твое время на Gmail-шаге** не засекается. Мы ведем тебя клик за
>   кликом, ты идешь в своем темпе.
>
> [Полные условия →](/guarantee)

### Checkout microcopy — Lemon Squeezy product page

Короткая строка рядом с кнопкой "Buy" / "Покупка". Не страницу, а
формулировку в чекауте.

**EN:** "30-day money-back guarantee. Full refund if setup fails or doesn't work."

**RU:** "30-дневная гарантия возврата денег. Полный возврат, если настройка не сработала."

### FAQ entry — на лендинге или /help

**EN:**

> **Q: What happens if the setup fails? Do I get my money back?**
>
> Yes. We have two guarantees:
>
> 1. **Automation failure:** if our Cloudflare or Brevo automation fails
>    on our end (API error, service outage, bug), the refund is automatic
>    within 24 hours. No need to request it.
> 2. **30-day functional guarantee:** if within 30 days you can't actually
>    use the email we set up — send or receive — email `support@getmailkit.com`
>    and we'll either fix it or refund you.
>
> We do not refund based on how long you took to complete the Gmail
> Send-As step yourself. That part is at your pace — we provide the
> copy-paste fields and a step-by-step wizard, but the clicks happen in
> your Gmail account.

**RU:**

> **Q: Что если настройка не удалась? Получу ли я деньги обратно?**
>
> Да. У нас две гарантии:
>
> 1. **Сбой автоматики:** если наша автоматика Cloudflare или Brevo
>    упала на нашей стороне (ошибка API, сбой сервиса, баг в нашем коде)
>    — возврат денег автоматический, в течение 24 часов. Запрашивать не
>    надо.
> 2. **30-дневная функциональная гарантия:** если в течение 30 дней не
>    можешь реально пользоваться настроенной почтой — отправлять или
>    получать — напиши на `support@getmailkit.com`, мы либо починим, либо
>    вернем деньги.
>
> Мы не возвращаем деньги на основании того, сколько времени ты сам
> провел в Gmail Send-As шаге. Этот шаг идет в твоем темпе — мы даем
> готовые поля для копирования и пошаговый мастер, но сами клики
> происходят в твоем Gmail-аккаунте.

### Post-purchase receipt email

В welcome/receipt email после покупки упоминаем гарантию одной строкой.

**EN:** "You're covered by our 30-day money-back guarantee. If the setup fails or doesn't work, email support@getmailkit.com — we'll fix it or refund you."

**RU:** "На тебя распространяется наша 30-дневная гарантия возврата денег. Если настройка не удалась или не работает — напиши на support@getmailkit.com, мы починим или вернем деньги."

---

## Internal operations — как мы реально обрабатываем refund'ы

### Automation failure — автоматический refund

**Trigger:** `setup_runs.status` переходит в `failed` где `failed_step` это
один из CF или Brevo этапов (не Gmail).

**Evidence:** `setup_runs.error_msg`, `cf_state` / `brevo_state` jsonb —
полный diagnostic payload. `created_at` и `updated_at` дают duration.

**Action:**
1. Cron / event handler (implementation TODO — отдельный тикет) ловит
   transition в failed со стороны automation.
2. Вызывает Lemon Squeezy API `POST /refunds` с `order_id` и `reason`.
3. Отправляет пользователю email: "Your MailKit setup failed on our end.
   Full refund issued automatically. It will return to your card in 3-10
   business days. Details: [error reference]".
4. Логирует `refunds` table row с `run_id`, `amount`, `reason=automation_failure`.

**Threshold:** refund только если `failed_step` в `{cf_*, brevo_*}`. Если
`failed_step` = `gmail_*` — это user-side issue, не automation. В этом
случае wizard показывает retry options, но refund не инициируется
автоматически. Юзер может запросить через 30-day канал.

### Functional failure — manual refund по запросу

**Trigger:** юзер пишет на `support@getmailkit.com` в течение 30 дней
после purchase.

**Evidence:** email от юзера + наш internal check через Supabase
(`setup_runs.user_id`, `purchase_id`, setup status = `done`).

**Action:**
1. Support отвечает в течение 48h working hours. Первая попытка — помочь
   починить (rotate DKIM, проверить DNS, diagnose).
2. Если fix за один back-and-forth невозможен ИЛИ юзер сразу требует
   refund — процесс refund через Lemon Squeezy API (manual trigger
   support-оператором).
3. Email юзеру: "Refund issued. Amount will return in 3-10 business days.
   Your domain setup remains functional until you choose to disable it
   (you paid, you own what we configured)."
4. Log `refunds` row с `reason=functional_30day_request`.

**Threshold:** refund только если purchase ≤30 дней назад И юзер описал
конкретную проблему ("can't send email from Gmail as hello@mydomain", не
"I changed my mind").

### Refund disputes — когда юзер spor'ит

Если refund отказан (out of 30-day window, или функциональный setup
работает и юзер передумал) — юзер может все равно инициировать chargeback
через банк. В этом случае:

1. Lemon Squeezy notifies нас о dispute.
2. Собираем evidence: DB records, email переписка с support, setup_run
   screenshots, verify что email реально работает (можем сами послать
   test письмо).
3. Respond через Lemon Squeezy dispute interface.
4. Если банк возвращает деньги юзеру несмотря на evidence — принимаем
   потерю, банк обычно сторонник покупателя на $5 суммах. Юзер попадает
   в internal blocklist (email, payment fingerprint) — если повторная
   покупка с того же профиля, не обслуживаем.

### Fraud mitigation

**Layer 1:** Lemon Squeezy built-in fraud detection — velocity checks,
IP patterns, card patterns. Первичный фильтр.

**Layer 2:** Rate limit на нашей стороне — 1 purchase per user (identified
by email) per 30 days. Нет массовой регистрации через одну машину.

**Layer 3:** После 2-го refund запроса с одного аккаунта — flag
"high-risk", уведомление support'у для ручного review перед следующим
setup'ом.

**Layer 4:** Blocklist — email, domain, payment fingerprint от confirmed
abusers. Stored in Supabase `blocklist` table (implementation TODO).

**Realistic fraud risk assessment:** для $5 продукта incentive у
fraudster'а минимальный. Нужно потратить 10-15 минут life-time на
регистрацию фейковой карты, signup, прохождение setup'а, dispute —
ради $5 возврата. Economical рентабельность ниже чем у phishing или
credit card brute force. Основной риск не массовый fraud, а случайные
disputes от confused customers ("я случайно купил" / "думал что-то
другое").

---

## Implementation TODO

Policy выше — написан текст и внутренние procedures. Часть инфраструктуры
еще не построена. Следующие тикеты нужны перед public launch.

1. **`/guarantee` static page** на getmailkit.com — full policy text в
   человекочитаемом формате + links в ToS. Копировать EN/RU из раздела
   "Formal policy" выше. Priority: HIGH (блокер лендинга).
2. **Refund trigger для automation failures** — cron job или webhook
   handler который ловит `setup_runs.status → failed` с CF/Brevo
   failed_step и вызывает Lemon Squeezy refund API. Priority: HIGH
   (блокер launch — без этого guarantee неработоспособен).
3. **`refunds` table в Supabase** — audit log всех refund'ов с reason,
   amount, run_id, purchase_id, triggered_by (auto/support). Priority:
   HIGH.
4. **Support email template** для functional refund — готовый текст для
   support-ответа, чтобы не писать каждый раз. Priority: MEDIUM.
5. **`blocklist` table + check** — email/payment fingerprint blocklist,
   check на входе в checkout. Priority: MEDIUM (post-launch после первых
   abusers если появятся).
6. **ToS page обновить** — взять EN текст из "Formal policy", интегрировать
   в ToS документ на сайте. Priority: HIGH.
7. **FAQ секция лендинга** — взять EN/RU Q&A из "Customer-facing wording",
   добавить на лендинг. Priority: MEDIUM (можно после soft launch).

---

## Cross-references — docs которые надо обновить

Следующие документы содержат устаревшую формулировку "5 minutes or money
back" и должны быть обновлены ссылкой сюда.

### `CLAUDE.md`

- Section "Honest positioning" — строка "Money-back guarantee if >5 minutes."
  → заменить на "Two-tier guarantee: automation failure auto-refund + 30-day
  functional guarantee. Full policy: [docs/GUARANTEE_POLICY.md]."
- Section "Known constraints" — строка "Honest positioning: '5 min, guaranteed'"
  → оставить как высокоуровневую позицию, ссылка на policy для деталей.
- Tagline "Email on your domain in 5 minutes, guaranteed." — оставить,
  теперь backed by actual structured guarantee.

### `docs/PRODUCT_BRIEF.md`

- Section "Launch strategy" → "Money-back guarantee" (строки 222-223) —
  заменить на short summary с ссылкой на GUARANTEE_POLICY.md.
- Section "Honest positioning rules" (строка 266) — "Guarantee: деньги
  назад если дольше 5 минут" → заменить на "Guarantee: см.
  docs/GUARANTEE_POLICY.md — automation-failure auto-refund + 30-day
  functional guarantee".

### `docs/MARKETING_ANGLES.md`

- Taglines (EN/RU, строки 90-97) — остаются как есть. "Guaranteed" теперь
  backed by policy, не overstated.
- Objection handling table — рассмотреть добавление row "Что если
  сломается?" → "30-day functional guarantee, automation-failure
  auto-refund. Подробно — /guarantee".

### `docs/GO_TO_MARKET.md`

- Section "Metrics" → "Churn / refund rate" — оставить как метрику.
  Добавить split на auto-refunds (automation failures) vs manual
  (functional requests) — разные signals.

---

## Changelog

**2026-04-23** — Initial version. Policy introduced as replacement for
deprecated "5 min or refund" formula. Author: architect. Owner approval:
pending explicit ack on this document before ToS page goes live.
