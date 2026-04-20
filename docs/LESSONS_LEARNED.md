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
