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
