# MailKit — Lessons Learned

Короткие разборы реальных инцидентов и gotchas, с которыми столкнулись
во время разработки. Формат: симптом → причина → фикс → правило на будущее.

## 2026-04-20 — Vercel Framework Preset залипает на "Other"

### Симптом
После merge PR #5 (prod scaffold) Vercel deployment упал с ошибкой:
`No Output Directory named "public" found after the Build completed.`
Страница возвращала 404 на всех маршрутах.

### Причина
Repo был подключен к Vercel ДО того, как Next.js scaffold попал в main.
На момент первого подключения в `main` лежали только документация и
`/reference/spike/` (Python). Vercel при первом сканировании не нашел
Next.js признаков (`next` в package.json, `next.config.js`, `app/`) и
зафиксировал Framework Preset = `Other` (static fallback).

После merge PR #5 с Next.js приложением Vercel **не пересканировал**
framework preset — он используется только при первоначальном setup.
Build запускался с дефолтом static-проекта (ожидал `public/` как
выходную директорию) и падал, т.к. Next.js кладет билд в `.next/`.

### Фикс
Vercel Dashboard → Project Settings → Build & Deployment →
Framework Preset = `Next.js` (вместо `Other`). Поля Build Command и
Output Directory оставить пустыми (дефолты Next.js). Save. Redeploy
последнего deployment через три точки в Deployments tab.

### Правило на будущее
Подключать проект к Vercel **после** того, как scaffold с целевым
framework'ом уже в `main`. Порядок:

1. Локально сделать scaffold (Next.js / другой framework) в PR
2. Смержить scaffold в `main`
3. Только ТЕПЕРЬ подключать repo к Vercel — он корректно
   автоопределит framework

Если порядок нарушен (как у нас: docs-PR'ы до scaffold'а) — после
merge scaffold'а руками проверить Framework Preset в Vercel Settings.

## 2026-04-21 — Quality gate exception для perf baseline PR

### Симптом
Первый PR по оптимизации лендинга (PR #9 `feat/landing-perf`) не
добирает до `Performance ≥ 90` на EN в 2h-cap: median 3-прогонов на
prod = 87 (runs 82/87/88). CLAUDE.md "Performance quality gate"
говорит "Если PR ломает метрики — НЕ мержим".

### Причина
Гейт формулировался как anti-regression guard (защита от deterioration
существующих метрик), а не как absolute-value block для первого
baseline PR. Baseline до PR #9 был EN 73 — PR дал +14, RU +4. Это
gain, не регрессия. Но буквальное чтение гейта ("не merge при фейле
любого") блокирует даже частичное улучшение, что делает первый
perf-PR нерелизуемым и замораживает progress.

Отдельно — достичь 90 одним PR невозможно без сверх-scope: остаточные
причины (Turbopack browserslist transpile gap, framework chunk
size, hero font-display) каждая требует своего PR по scope discipline.

### Фикс
Архитекторский exception (2026-04-21): partial improvement одобрен к
merge. Гейт ≥90 переносится в follow-up perf-PR, пункт зафиксирован
в `docs/TICKETS_BACKLOG.md` секция "Tech debt → Landing performance
optimization on live" с 4 ранжированными гипотезами. Follow-up
открывается **после** Ticket #4a — setup pipeline приоритетнее чем
добивка perf-баланса.

Post-merge prod medians (3 runs / locale):

| Metric | EN (median / runs) | RU (median / runs) |
|---|---|---|
| Performance | **87** / 82,87,88 | **87** / 87,87,88 |
| LCP | 3.18s | 3.18s |
| FCP | 3.02s | 3.04s |
| TBT | 68ms | 70ms |
| CLS | 0.000 | 0.002 |

### Правило
Гейт `Perf ≥ 90 / SEO ≥ 95 / A11y ≥ 90 / BP ≥ 90 / LCP < 2.5s /
FCP < 1.8s / TBT < 200ms / CLS < 0.1` применяется к non-perf-baseline
PR'ам (feature/UI-тикеты, которые не должны ронять метрики).

Perf-baseline PR'ы — отдельный класс:
- Оцениваются по **delta vs previous baseline**, не по absolute.
- Если target не взят в 2h-cap — документируй gap с числами и
  гипотезами в `TICKETS_BACKLOG.md`, merge partial, follow-up отдельным
  PR.
- Post-merge: median 3-прогонов на prod, не single-run (Lighthouse
  noise ±5). Если median просел ниже pre-PR baseline — rollback через
  Vercel Deployments → Promote previous, разбор отдельно.

## 2026-04-21 — Vercel CDN cold-cache perf-measurement artifact

### Симптом
Сразу после merge PR #10 (Ticket #4a Cloudflare pipeline) prod
Lighthouse median 3×3 показал резкую регрессию landing'а:
EN 87 → 71 (warm), RU 87 → 55 (warm). TBT RU взлетел с 70ms до 1008ms.
Открыл `chore/perf-post-4a-regression-fix` по директиве "fix-forward",
начал искать причину в bundle. **Ни одна из гипотез (lucide barrel /
zod client leak / sonner root / shadcn) не подтвердилась числами.**

### Причина
Никакой регрессии в коде или bundle не было — это был **cold-cache
measurement artifact** Vercel Edge CDN.

Bundle diff pre (`5ef5157`) vs post (`a16f14a`) через Turbopack
`build-manifest.json` + `stat -c %s .next/static/chunks/*`:

| | Pre | Post | Delta |
|---|---|---|---|
| Landing `/en` total JS served | 984.23 KB | 984.49 KB | +256 bytes |
| `rootMainFiles` count | 5 | 6 | +1 |
| `rootMain` total | ~456 KB | ~458 KB | +2 KB |
| Polyfills chunk | 113 KB | 113 KB | 0 |

Grep по post client chunks: 0 упоминаний `lucide-react`, 0 упоминаний
`zod`/`ZodError`. Sonner/shadcn chunks идентичны по размеру.

Local Lighthouse (одинаковая среда, без CDN) median 3× перед вы после:
EN 67 → 70, RU 66 → 65 — в пределах single-run noise ±5. **Код не
регрессировал.**

Prod warm re-measure через ~1 час после deploy (CDN edge cache
прогрелся):
- EN Perf median: 71 (cold) → **77** (warm)
- RU Perf median: 55 (cold) → **74** (warm)

RU подскочил +19 пунктов просто от прогрева кеша. Первоначальное
измерение я делал в первые ~10 минут после Vercel `readyState=READY`,
когда edge региона к которому подключался Lighthouse-chrome еще не
имел прогретого кеша статики, и метрики LCP/FCP/TBT были непомерно
высокими против baseline PR #9, который я мерил через час+ после
merge.

### Фикс
Post-hoc "fix-forward" PR не применим, когда причина — noise
measurement. Ветка `chore/perf-post-4a-regression-fix` сброшена,
ничего не коммитилось. Prod остается на `a16f14a`.

Стабильный re-measure запланирован на следующий день после merge
(≥12h warm cache) — если median ≥85 → подтверждение noise;
80-84 → measured baseline в attempt-2 perf-PR; <80 → открывается
investigation PR, возврат к анализу.

### Правило
Lighthouse post-deploy baseline снимать **не раньше чем через 60 мин
после Vercel `readyState=READY`**, либо после 10+ последовательных
прогревающих `curl` с разных регионов (Vercel edge cache prime).

Single-edge cold run в первые 10 мин после deploy — **не метрика,
measurement noise ±15 points** от стабильного значения (конкретно в
этой истории: cold EN 71 / RU 55 vs warm EN 77 / RU 74 через час).

Перед тем как объявлять perf-регрессию:
1. Сверить bundle diff через `.next/static/chunks` sizes + `build-manifest.json` pre/post. Identical → noise hypothesis.
2. Прогнать local Lighthouse 3× медиану для pre vs post builds в одинаковой среде. Identical в пределах ±5 → noise.
3. Перемерить prod через 1+ час warm cache. Если recover'ил 10+
   points → cache cold was the cause, не код.

Только если все три показывают реальную разницу — открывать
fix-forward PR. Иначе: документировать noise, continue.

## 2026-04-22 — Brevo authenticated domain: GET дропает DKIM

### Симптом
Live smoke Ticket #4b на `mailkit-test.ru`. CF pipeline зеленый, click
"Continue to Brevo setup" → через ~5 сек `brevo_unavailable` в UI.
После инструментации (commit `9762958` с `{details}` в brevo_* keys)
payload surfaced: `http=404 code=duplicate_parameter msg="Domain with
same name already exists"`. Fix ветки (`3b9dd1b`): ослабил
`duplicate_parameter` mapping до любого HTTP status + добавил
`getSenderDomain` direct-lookup в resolve-path. Следующий retry —
новый error `http=0 code=missing_records msg="Brevo response missing
DKIM or brevo-code record"`. Это наш internal error из brevo.ts:791.

Boris проверил Brevo Dashboard: `mailkit-test.ru` в статусе
**Authenticated**.

### Причина
Brevo `GET /v3/senders/domains/{name}` для **authenticated** domain
возвращает `{id, domain_name, authenticated: true, verified: true}`
без `dkim_record` / `brevo_code_record` / `dmarc_record`. Поля
возвращаются только в POST response (момент создания) и в GET для
pending/unverified domains. Семантика: records уже в DNS,
Brevo их больше не surface'ит — для дальнейшего flow не нужны.

Наш pipeline при resolve existing domain (после `duplicate_parameter`)
ожидал DKIM в ответе, чтобы upsert'ить DNS, и throws `missing_records`
на authenticated domain. Это idempotency gap: на shared Brevo account
если customer domain уже был authenticated (предыдущий setup, ручной
add в Brevo UI, testing на том же домене) — pipeline не мог
завершиться.

### Фикс
`continueBrevoSetup` short-circuit'ит на `domain.authenticated === true`:
- Skip DNS write (records уже в DNS)
- Skip verify poll (уже verified)
- Mark run status directly `brevo_done`
- Flag `brevoState.already_authenticated = true` для observability

Plus defensive: если `authenticated === false` но DKIM все равно
отсутствует (pending-но-corrupted edge case) → errorKey
`brevo_state_unrecoverable` с явным сообщением «напиши в поддержку».

Tests: 2 новых в `actions.test.ts` для authenticated short-circuit и
missing_records defensive branch. 79/79 green.

### Правило
Для third-party API, которые возвращают разные response shapes для
разных resource states:
1. Не предполагай что GET idempotent-возвращает всё то же самое что POST.
2. Always check state field (`authenticated`, `status`, `verified`) до
   того как вытаскивать downstream fields из response.
3. State transitions map'ай явно: для каждого state → какой flow path.
   В нашем случае: `authenticated=true → skip-to-done`, `false + DKIM
   present → DNS + verify`, `false + DKIM missing → unrecoverable`.

Design follow-up (в backlog, не решать сейчас): на shared Brevo
account ownership/boundary semantics когда customer domain уже
authenticated "нами" от другого customer — reuse OK или deny? Это
абуз-vector в prod, не только smoke corner case.

### Другое из того же смоука — CF API permission matrix
В том же smoke upstream hit CF `10000: Authentication error` на
`POST /zones/{id}/email/routing/enable`. Наш `tokenHelp` в
`messages/{en,ru}.json` просил `Zone:Zone:Edit` + `Zone:Zone
Settings:Edit` + `Account:Email Routing Rules:Edit`. Первые два — false
positives (не нужны для нашего flow), третий — **wrong scope level**
(account vs zone).

Реальный minimal-и-достаточный permission set для `cloudflare.ts`:
- `Zone:Zone:Read` (zone-scoped) — `listZones`
- `Zone:DNS:Edit` (zone-scoped) — DNS upserts
- `Zone:Zone Settings:Edit` (zone-scoped) — **enable email routing**
  (не отдельный `Email Routing:Edit`, такого permission в CF UI нет
  — это галлюцинация intermediate fix'а, коррект — именно Zone
  Settings)
- `Zone:Email Routing Rules:Edit` (zone-scoped) — create routing rule
- `Account:Email Routing Addresses:Edit` (account-scoped) — create
  destination

Правило: перед тем как писать required permissions в tokenHelp
копируй: (1) API endpoint используемый в коде, (2) CF docs ссылку на
required permission для endpoint, (3) verbatim permission name из
CF Dashboard dropdown (не угадывай по логике). Для missing permission
идти в [CF API docs permissions reference](https://developers.cloudflare.com/fundamentals/api/reference/permissions/)
или directly в [API method endpoint docs](https://developers.cloudflare.com/api/).

## 2026-04-23 — Integration research: начинать с reference/spike/, не с public docs

### Симптом
Ticket #6 pre-flight research по Brevo SMTP credentials — 20 минут ушло
на developers.brevo.com + help.brevo.com + context7 + web search пока
я пытался найти programmatic endpoint для SMTP key management. Docs не
ответили на ключевой вопрос (per-sender vs shared account-level), только
косвенные сигналы. В итоге открыл `reference/spike/modules/brevo.py` —
там на строке 172 прямым текстом: *«Brevo не отдает SMTP key через
API — только через UI»* + working solution с env-vars fallback. 5 минут
максимум вместо 20.

### Причина
Public docs написаны маркетологами, покрывают happy path, замалчивают
отсутствующие возможности (особенно если это "gap in API surface" —
компании не любят это документировать). Spike-код — результат
живого trial-and-error: dev уже ударился головой обо все граничные
случаи, обошел их, задокументировал (коммит + inline комменты с
контекстом). Особенно для edge cases типа "а есть ли в этом API X",
spike авторитетнее маркетинговых docs.

У нас в `reference/spike/` лежат модули CF, Brevo, Gmail — покрывают
все три наших внешних integration'а и все прошли end-to-end smoke на
реальных доменах. Каждый раз когда возникает новый вопрос по integration
(«есть ли такой endpoint», «что возвращает это поле в edge case»,
«как хорошо это работает на shared account») — spike уже знает.

### Правило
**Research integration'ов (CF, Brevo, Gmail, любые будущие) начинаем с
`reference/spike/`, потом docs.** Workflow:

1. Открой соответствующий `reference/spike/modules/<integration>.py`.
   Прочитай docstring + inline comments — там уже расписаны gotchas.
2. Если spike отвечает на вопрос → используй это как source of truth,
   проверь только что docs не поменяли behavior с момента спайка
   (если спайку >6 месяцев).
3. Если spike не покрывает твой вопрос → public docs + API reference.
4. Если docs тоже не ответили → prototype на test-домене (у нас есть
   `mailkit-test.ru`). В этом случае добавь findings в
   `docs/SPIKE_FINDINGS.md` — для следующего dev'а.

Это не отменяет docs lookup совсем — spike старше docs, API contracts
меняются — но spike существенно сокращает deer-path-ing через
сотни страниц docs.

## 2026-04-23 — Shared Brevo SMTP credentials: design-ограничение зафиксировано

### Симптом
Архитекторский kickoff #6 предполагал API развилку "per-sender vs shared
SMTP credentials" как open question; research показал что развилки нет —
Brevo тупо не предоставляет API для SMTP key management, все shared
account-level. Итоговый scope #6 упростился (не нужен
`createSmtpCredential` / `getSmtpCredential` API client), но архитектурная
посадка теперь навсегда shared: один SMTP key на всех customer'ов нашего
Brevo account.

### Причина
Brevo архитектурно не разделяет outbound authentication от sender identity.
Authentication (SMTP key) — account-level; sender identity
(From-address) — domain-level через DKIM + brevo-code DNS records.
Design этот не менять — Brevo нам не подконтролен.

### Правило
**Этот trade-off зафиксирован в [docs/SECURITY.md](SECURITY.md) раздел
«Shared Brevo SMTP model».** Не переспрашивать «а почему per-sender не
сделано» — не сделано потому что Brevo не дает такого API. Документ
описывает:

- Abuse vectors (shared surface, rotation cascade, IP reputation)
- Compensating controls (rate limits, rotation plumbing, monitoring) —
  все в backlog как tech debt, не блокеры для MVP
- Non-persistence of SMTP password — password рендерится один раз в
  UI через RSC, не пишется в DB

Если когда-то в будущем Brevo добавит per-sender SMTP API либо мы решим
уйти от shared-account модели — это будет архитектурный рефакторинг всей
Brevo integration (cost уровня entire Ticket #4b). До этого shared —
наш контракт.

## 2026-04-23 — Brevo SMTP login ≠ account email (wrong directive during #6 env setup)

### Симптом
Ticket #6 live smoke на `mailkit-test.ru`. Boris дошел до Gmail Step 3
(SMTP config), вставил host/port/username/password в Gmail Send-As диалог,
Gmail отклонил с `535 Authentication failed`. Причина всплыла через
~30 минут: `BREVO_SMTP_LOGIN` в Vercel env был заполнен account email
(`bkomarov85@...`), а не auto-generated SMTP login.

### Причина
Во время pre-etap-1 research я сверился с Python spike и передал
owner'у директиву заполнить `BREVO_SMTP_LOGIN` как «account email from
`GET /v3/account.email`». Spike fallback в
[reference/spike/modules/brevo.py:169-199](../reference/spike/modules/brevo.py)
действительно делал так — исторически (до 2024) Brevo SMTP relay
принимал account email + API key как master credential. На момент #6
(2026-04) Brevo уже требует **dedicated SMTP login** формата
`<accountID>@smtp-brevo.com`, который генерится отдельно и живет в
`app.brevo.com → SMTP & API → SMTP tab → "Login" field`. Account email
с этого эндпоинта — это логин юзера в Dashboard, не SMTP identity.

Два значения выглядят одинаково (оба email-формата), но валидны в
разных местах:
- Account email — для Brevo Dashboard login
- SMTP login `<accountID>@smtp-brevo.com` — для SMTP relay auth

### Фикс
- Owner пересоздал значение `BREVO_SMTP_LOGIN` в Vercel env на реальный
  SMTP login из Dashboard → SMTP tab → Login field. Preview redeploy
  для cold-start env pickup → `prepareGmailStep` return payload →
  wizard Step 3 корректный.
- [.env.example](../.env.example) обновлен: коммент на
  `BREVO_SMTP_LOGIN` теперь явно говорит «auto-generated
  `<accountID>@smtp-brevo.com`, NOT account email; value from SMTP Login
  field in Dashboard».
- [docs/SPIKE_FINDINGS.md](SPIKE_FINDINGS.md) раздел «Brevo SMTP
  credentials — API НЕ СУЩЕСТВУЕТ» расширен ⚠️ gotcha про fallback
  option (b) — spike fallback больше не работает, только env vars из
  реального SMTP Login field.

### Правило
**Prior-art в spike != evergreen.** Python spike прогнан 2026-04-20; то
что работало там, не обязательно работает на момент разработки feature
ticket'а через 3+ дня. Особенно для third-party APIs с моделью «legacy
compatibility window → breaking change». Перед тем как передавать
owner'у env-setup директиву:

1. Сверься не только со spike, но и с **актуальной** Dashboard UI
   (руками открой соответствующий tab, сверь какое именно поле под
   какую переменную мапится). Spike 3+ дня старше актуального
   third-party UX — принимать за evergreen нельзя.
2. Если директива про external integration setup — добавляй шаг
   verification: «owner пишет обратно `echo $BREVO_SMTP_LOGIN | head -c
   25` — должно начинаться с цифр аккаунта, не буквы». Дешёвый sanity
   check что mapped правильное поле из Dashboard.
3. Gotchas в `docs/SPIKE_FINDINGS.md` обновляем live в день инцидента,
   не копим на ревизию — follow-up dev должен найти актуальное guidance
   сразу, а не через conflict с устаревшим текстом.

Костяк применим к CF / Brevo / Gmail и любым future integrations.

## 2026-04-22/23 — Preview vs prod Lighthouse: разные измерительные среды

### Симптом
После push feature-ветки `feat/ticket-4b-brevo` я замерил Lighthouse на
preview-deploy, median n=3 показал RU Perf 54 (против main-preview 66,
delta −12) и TBT +222ms. Открыл инвестигейшн `chore/perf-post-4a-investigation`
под гипотезой "RU-специфичная регрессия от #4b" (messages growth,
pluralization, RSC payload). Начал планировать fix PR.

### Причина
Preview Lighthouse — **не воспроизводимый измерительный стенд**. Три
последовательных runs на идентичном preview URL дали TBT 326ms → 260ms
→ 21ms. Это lambda cold-start + simulate throttling variance, не код.

Falsification того, что регрессия в коде:
1. JS bundles EN/RU — byte-identical (16 файлов, 262,713 байт, проверено
   через `performance.getEntriesByType('resource')` на cold load). Мой
   первый репорт "RU +5 файлов +97KB" был filter-bug: фильтр включал
   .woff2 шрифты, матчившие `_next/static`. Реальные JS-only счетчики
   совпадают.
2. `messages/{en,ru}.json` — идентичная структура (95 ключей, depth-
   distribution `{2:23, 3:35, 4:19}`). Size delta — чистый UTF-8 overhead
   кириллицы (~33% длиннее).
3. RSC+HTML payload: +11% RU vs EN — ожидаемо для cyrillic, не регрессия.
4. `t()` calls audit на setup-wizard path: 0 pluralization calls →
   next-intl плюрализация Russian (4 форм) не исполняется → эта
   гипотеза исключена.

После merge #11 на prod с ≥60 мин warm: RU 85 (vs pre-merge stored
baseline 74) — **improvement**, не regression. Preview сигнал был
полностью false-positive.

Отдельный outlier-related подкос: pre-investigation TTFB measurement
показывал POST /en median 0.55s (+120ms vs pre), но там был 1.29s
outlier в single run. Fresh n=10 дал 0.46s median (trimmed mean 0.46)
— реальная delta +50ms, не +120. Median на n=10 чувствителен к одному
outlier в ±100ms. Нужно: n≥10, trim min+max перед median.

### Фикс
Fix PR `chore/perf-post-4a-4b-fix` отменен (не создавался). Ветка
`chore/perf-post-4a-investigation` закрыта findings-only коммитом +
post-merge измерениями. Actual post-#4b на prod:

| Локаль | Pre-#4a | Post-#4a stable | Post-#4b (this round) | Delta vs post-#4a |
|---|---|---|---|---|
| EN | 87 | 77 | 75 | −2 (noise) |
| RU | 87 | 74 | 85 | +11 (improvement) |

Systemic perf work отложен в backlog как attempt-3 (не специфичен для
одного тикета — делать после app-shell complete).

### Правило
**Preview Lighthouse — non-gating signal.** Cold-start variance ×15
run-over-run на identical URL делает preview непригодным для
merge-gate с deltas <20 points. Использовать preview LH только для
грубого "order of magnitude" smoke (не упал ли в ×2 по Perf score),
не для abs-vs-baseline сравнений.

**Prod Lighthouse — gating, но только с корректной методологией:**
- ≥60 минут warm на prod alias ДО первого измерения (CDN edge cache +
  lambda pool prime)
- n≥10 TTFB curl samples для TTFB stability check, **trim min+max
  перед median** (outlier 1.29s в одном из 10 сдвигает median на
  ~100ms — фальшивый регрессионный сигнал)
- n≥5 LH runs per locale, **median**, не single run
- Сравнение с **сохраненным prod baseline** идентичной methodology,
  не с preview и не с ad-hoc single-run

**Bundle diff falsification перед тем как открывать fix PR:**
- `performance.getEntriesByType('resource')` фильтр: **JS-only по
  `initiatorType==='script'` или по `.js` extension**, не по URL
  substring — `_next/static` матчит и шрифты тоже.
- Вручную проверить byte-count EN vs RU (или pre/post для
  регрессии). Identical → это не bundle, копать в других местах.

**Полная методология и raw artifacts**: [docs/investigation-2026-04-22/](investigation-2026-04-22/)
— FINDINGS.md, POST_MERGE_SOP.md, post-merge-lh-summary.txt.
