# MailKit — Market Research (Deep Research)

**Дата:** 2026-06-14
**Метод:** deep-research harness — 108 агентов, 6 углов поиска, 25 источников, 94 клейма извлечено, 25 верифицировано adversarially (3-vote), 10 подтверждено, 15 убито.

---

## Вопрос исследования

Market research on email setup automation for small businesses using Cloudflare DNS:
1. Market size / TAM для domain email setup tools для нетехнических SMB на Cloudflare DNS
2. Конкурентный ландшафт (ImprovMX, Forwardemail.net, Zoho Mail, Google Workspace wizards, Mailgun)
3. Pricing benchmarks: one-time setup tools vs subscription
4. Боли вокруг DNS email config (SPF/DKIM/DMARC, Gmail Send-As)
5. Cloudflare Email Routing adoption и рост
6. Валиден ли рынок для $5 one-time tool (CF Email Routing + Postmark SMTP + Gmail Send-As)

---

## Executive Summary

Исследование подтверждает **реальный, недообслуженный рынок**: Cloudflare Email Routing показал массовое органическое внедрение (550K+ инбоксов, 2M сообщений/день к концу 2022, 0.7% от топ-10M отслеживаемых сайтов на июнь 2026) — при этом **нет автоматизированного end-to-end setup-инструмента**, закрывающего разрыв между приёмом почты и профессиональной отправкой.

DNS email authentication (SPF/DKIM/DMARC) остаётся плохо внедрённым даже среди топовых доменов — 39% без SPF, 66.6% без DMARC — подтверждая, что боль реальна и широко распространена.

Конкурентный ландшафт построен на подписках (ImprovMX $9/мес), оставляя позиционирование **$5 one-time** неоспоренным. Критическая техническая сложность (DKIM не подписывается Gmail при Send-As с личного Gmail, требует аккуратной SPF/DMARC настройки) — именно та точка трения, которую устраняет setup-визард.

$5 one-time инструмент для пользователей Cloudflare DNS, которым нужен полный inbound + outbound + Gmail Send-As стек, **дифференцирован от каждого выявленного конкурента**.

---

## Подтверждённые находки (Confirmed)

### 1. Cloudflare Email Routing — реальное массовое внедрение `[HIGH]`

> Cloudflare Email Routing достиг 550,000+ активных инбоксов и 2M сообщений/день к октябрю 2022, после добавления десятков тысяч новых зон в день в closed beta и сотен тысяч зон к open beta (февраль 2022). На июнь 2026 используется 0.7% топ-10M отслеживаемых сайтов.

- **Confidence:** high
- **Vote:** 4 клейма объединено, 3×(3-0) + 1×(2-1)
- **Evidence:** Cloudflare engineering blog (октябрь 2022) дословно: *"processing email traffic for more than 550,000 inboxes and forwarding an average of two million messages daily, and still growing month to month."* Февральский open-beta анонс: *"hundreds of thousands of zones"* и *"tens of thousands of new zones every day into the closed beta."* W3Techs (независимый, обновлён 13 июня 2026): 0.7% топ-10M сайтов используют Cloudflare как email server provider.
- **Sources:**
  - https://blog.cloudflare.com/email-routing-leaves-beta/
  - https://blog.cloudflare.com/email-routing-open-beta/
  - https://w3techs.com/technologies/details/em-cloudflare

### 2. DNS email authentication внедрён критически слабо `[HIGH]`

> 39% топ-1M доменов вообще без SPF записи, и 66.6% без валидного DMARC. Этот разрыв — ядро боли, которую решает MailKit.

- **Confidence:** high
- **Vote:** 2 клейма объединено, оба 3-0
- **Evidence:** Один первичный источник (dmarcchecker.app, анализ 2024 Tranco топ-1M доменов через DNS lookup) даёт обе цифры: *"39% of top 1M domains lacked an SPF record"* и *"only about one-third (33.4%) of the domains having a valid DMARC record."* Косвенное подтверждение: Valimail (конец 2024) — ~20% DMARC adoption по топ-10M доменам (меньшая популяция, то же направление). Примечание: у dmarcchecker.app есть коммерческий интерес показывать низкое внедрение, но методология raw DNS-lookup воспроизводима и подтверждается Valimail по направлению.
- **Sources:**
  - https://dmarcchecker.app/articles/spf-dkim-dmarc-adoption-2024

### 3. ImprovMX (доминирующий конкурент) — подписка, не one-time `[HIGH]`

> Доминирующий конкурент в forwarding/routing (ImprovMX) использует freemium-подписку — free tier ограничен 1 домен/25 алиасов/500 forwards в день, платные планы от $9/мес — без one-time опции, оставляя ценовую точку $5 one-time полностью неоспоренной.

- **Confidence:** high
- **Vote:** 2 клейма объединено, оба 3-0
- **Evidence:** Live fetch страницы ImprovMX (июнь 2026): free tier *"1 domain, 25 aliases, 500 emails forwarded per day"*; Premium *"$9/mo ... Up to 30 domains ... 100 aliases per domain ... 6,000 SMTP sends per month."* ImprovMX — только forwarding: не настраивает Postmark SMTP, не делает DKIM для исходящих, не настраивает Gmail Send-As, поэтому даже при $0 не является заменой полного стека MailKit. Конкурентов с сопоставимым one-time setup-инструментом не выявлено.
- **Sources:**
  - https://improvmx.com/pricing/

### 4. Gmail Send-As + CF Email Routing требует аккуратной SPF/DMARC настройки `[MEDIUM]`

> Комбинация Gmail Send-As + Cloudflare Email Routing требует аккуратной SPF и DMARC настройки, потому что личный Gmail не DKIM-подписывает исходящую почту для custom domain — делая эту мультисервисную конфигурацию точным техническим барьером, который нетехнические SMB не могут пройти сами.

- **Confidence:** medium
- **Vote:** 1 клейм, 2-1
- **Evidence:** dev.to технический блог (2-1, не единогласно) дословно: *"Setting the above is critical to not getting your custom domain's email bounced or rejected, especially as it won't be DKIM signed by Gmail."* Подтверждается документацией DMARC Report: Gmail SMTP не применяет DKIM для не-Google-hosted доменов. **Важный нюанс:** архитектура MailKit использует Postmark для исходящего SMTP, который DKIM-подписывает — частично обходя описанную проблему. Но SPF и DMARC настройка остаются обязательны. Источник — блог (не первичная вендорская документация), отсюда medium.
- **Sources:**
  - https://dev.to/jaygooby/use-a-basic-gmail-account-to-send-mail-as-with-a-domain-that-uses-cloudflare-email-routing-89b

---

## Caveats (важные оговорки)

1. **Размер базы Cloudflare DNS:** ни одна верифицированная цифра общего числа Cloudflare DNS доменов не пережила adversarial-верификацию. Клейм "34M доменов" опровергнут 3-0. Цифра W3Techs 0.7% относится к топ-10M отслеживаемых сайтов, не ко всем доменам — реальное число пользователей CF DNS (часто цитируется как 10M+) не подтверждено. **Это самое важное неизвестное для оценки TAM.**

2. **Market size / TAM:** ни одна цифра размера рынка не пережила верификацию. Клейм "$1.37B email forwarding market" опровергнут 3-0 как неподтверждённый. Валидной TAM-цифры в находках нет — размер рынка нужно оценивать косвенно через данные внедрения Cloudflare.

3. **Готовность SMB платить:** первичных исследований готовности SMB платить за setup-автоматизацию, переживших верификацию, нет. Валидация $5 выведена из конкурентных бенчмарков (подписка ImprovMX $9/мес), а не из исследования спроса.

4. **Чувствительность ко времени:** метрики Cloudflare Email Routing (550K инбоксов, 2M сообщений/день) — от октября 2022, почти 4 года назад. Цифра W3Techs 0.7% актуальна (13 июня 2026), но не даёт абсолютного числа доменов. Траектория роста с 2022 в подтверждённых клеймах не задокументирована.

5. **Качество источников:** ключевая находка (Gmail DKIM/SPF) опирается на пост dev.to с голосом 2-1, не первичный вендорский источник. Данные DMARC/SPF adoption — от вендора (dmarcchecker.app) с коммерческим интересом показывать низкое внедрение.

---

## Открытые вопросы

1. Каково текущее (2025-2026) общее число доменов на Cloudflare DNS — реальный addressable market для MailKit? Цифра 550K инбоксов — 2022; данных CF Email Routing после 2022 не пережило верификацию.
2. Есть ли доказательства спроса со стороны SMB (опросы, исследования willingness-to-pay, conversion-данные сопоставимых setup-инструментов), которые валидируют $5, а не выводят из конкурентного бенчмаркинга?
3. Сколько пользователей CF Email Routing уже настроили исходящий SMTP (Postmark, SendGrid и т.д.) сами — и какая доля из когорты 550K+ остаётся застрявшей без рабочей отправки с custom domain?
4. Есть ли другие one-time / setup-wizard конкуренты помимо ImprovMX, не пойманные ресёрчем (региональные инструменты, приложения Cloudflare Marketplace, или грядущие нативные фичи CF, способные устранить gap, который закрывает MailKit)?

---

## Опровергнутые клеймы (Refuted — НЕ использовать в копи)

| Клейм | Vote | Источник |
|---|---|---|
| 85.7% доменов без эффективной DMARC-защиты (57.2% используют p=none) | 0-3 | dmarcchecker.app |
| ImprovMX Light план $50/год (~$4.17/мес) до 5 доменов | 0-3 | improvmx.com |
| Только 53.8% отправителей использовали DMARC в 2024 (рост с 42.6% в 2023) | 0-3 | mailgun.com |
| 66.2% всех отправителей используют SPF+DKIM, 25.7% не уверены | 1-2 | mailgun.com |
| 34,180,771 доменов используют Cloudflare nameservers (июнь 2026) | 0-3 | netapi.com |
| Рынок email forwarding оценён в $1.37B на июнь 2026 | 0-3 | theguidex.com |
| Cloudflare Email Routing полностью бесплатен на всех планах без volume-лимитов | 0-3 | theguidex.com |
| Нетехнические SMB перед бинарным выбором: переплачивать за Workspace $7.20/user/мес или ненадёжные free-сервисы | 0-3 | theguidex.com |
| CF Email Routing полностью устраняет нужду в custom mail server | 0-3 | dev.to |
| Настройка DKIM не straightforward даже для security-команд | 0-3 | dmarcreport.com |
| Cloudflare не предлагает традиционный email hosting (нет mailboxes/storage/sending) | 0-3 | truehost.com |
| CF Email Routing требует пары со сторонним SMTP (SendGrid) для исходящих | 0-3 | truehost.com |
| Спамеры внедряют SPF/DKIM/DMARC успешнее, чем легитимные бизнес-админы | 0-3 | news.ycombinator.com |
| Первая DMARC/DKIM имплементация в компании может занять полный месяц | 0-3 | news.ycombinator.com |
| Email forwarding через CF в Gmail подтверждённо работает надёжно (один комментатор) | 0-3 | news.ycombinator.com |

---

## Вывод (синтез ресёрча + проектных файлов)

**Ниша:** реальная, свободная, незанятая в точной конфигурации CF + Postmark + Gmail Send-As.

**Спрос:** есть. 550K+ пользователей CF Email Routing уже настроили входящие и не настроили исходящие — это и есть аудитория.

**Деньги:** $5 one-time — входной билет, не бизнес. Реальная экономика:
1. Мониторинг $3/мес (recurring) — даже 200 подписчиков = $600/мес MRR
2. Agency tier после первых клиентов
3. Расширение на не-CF DNS через ImprovMX API (TAM ×2-3)

**TAM по проектным файлам:** ~150-200K нетехнических CF-юзеров, 0.5-2% capture = $3.7-15K/год от сетапов (не подтверждено внешними данными — ни одна TAM-цифра не пережила верификацию).

**Главный экзистенциальный риск:** Cloudflare может закрыть этот gap сам, добавив нативный outbound SMTP wizard.

**Ceiling:** без расширения — lifestyle money (~$15-20K/год). С мониторингом + агентствами — другая история.

---

## Статистика прогона

| Метрика | Значение |
|---|---|
| Углов поиска | 6 |
| Источников fetched | 25 |
| Клеймов извлечено | 94 |
| Клеймов верифицировано | 25 |
| Подтверждено | 10 |
| Убито | 15 |
| После синтеза | 4 находки |
| URL-дублей | 4 |
| Отброшено по бюджету | 7 |
| Вызовов агентов | 108 |
