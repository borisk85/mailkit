# MailKit — CLAUDE.md

## ⚠ Communication rules (критично)

- НИКОГДА не советовать Boris сделать hard refresh / Ctrl+Shift+R / очистить кеш.
- Если изменения не видны — искать проблему в коде/деплое.

## ⚠ Fact-check before draft (критично)

Перед копи-драфтом о продукте — читать код, не из головы:
- Шаги флоу → `app/[locale]/app/setup/actions.ts` + `setup-wizard.tsx`
- Тайминги и тексты → `messages/en.json`

## ⚠ Copy & UI rules (критично)

0. **Баг** — чинить сразу, без команды. **CSS/layout без смены текстов** — чинить и пушить сразу, без «жду команды трогать». НИКОГДА не писать «жду команды» на код/CSS-правку — нигде не написано ждать, обратное написано явно. **UI вопрос** («почему так выглядит?», «как было?», «нормально?») — отвечать словами, код не трогать. **Варианты A/B/C** — предложить, замолчать, ждать команды. Реализовывать только после явного «сделай A» / «давай B» / «A» от Boris. Никогда не выбирать самому и не начинать до команды.
   **Вопрос ≠ команда. Эмоция ≠ команда. Недовольство ≠ команда.** «хуйня», «урод», «не пойдёт», «тавтология» — это реакции, не команды. Отвечать словами, ждать. Трогать код только на явный императив: «сделай», «правь», «давай», «ок», «A», «B», «C».
   **Scope = ровно то, что сказано.** Сказал убрать X — убираю только X. Не трогаю Y и Z рядом, даже если кажется логичным.
1. **Лендинг копи** — только после явного «ок» от Boris. Не изобретать, не улучшать — его слова вставлять без изменений. Правило не блокирует CSS/layout.
2. **Копи внутри /app** — улучшения и исправления делать сразу, без запроса ок.
3. **Запрещённые слова в копи:** «возня», «херня», «хрень», «под капотом», «трекинг», «автоматика» (как существительное), «КП», «Q2», «pipeline».
3a. **Точка с запятой `;` ЗАПРЕЩЕНА в любой видимой копи** — везде, внутри текста: лендинг, /app, глоссарий, легал-страницы (terms/privacy/guarantee/disclaimer), email, любые хардкод-строки в компонентах. Внутри предложения — только точка, тире «—» или запятая. Единственное исключение — технические значения, не являющиеся прозой (DNS-записи вроде `v=DMARC1; p=none; rua=…`). Перед вставкой/правкой копи — проверить, что `;` нет.
4. **Бренд-иконки** — только `react-icons/si` или SVG от Boris. Не рисовать самописные аппроксимации.
5. **Не выходить за scope** — Boris сказал X, меняю только X. Новое поведение/атрибут/логика — спросить.
6. **Проверять дубли слов** — перед вставкой слова смотреть соседние элементы (eyebrow, title, body).
7. **Нечеткий UI-таск** — сначала посмотреть reference в `c:/Claude Code/vibecraft` или `agent-builder-saas`, предложить, потом делать.

## ⚠ Scope Discipline (критично)

MVP v1 scope → [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md). Новые фичи: сначала проверь scope, если нет — backlog, не код.

Backlog (не трогать до валидации): self-serve diagnostics, re-setup, monitoring, bundles, Chrome Extension, Workspace version, white-label, multi-domain.

## Quick context

**Email setup automation** для пользователей Cloudflare DNS. $5 per mailbox. Настраивает CF Email Routing + Postmark SMTP + DKIM/SPF/DMARC + Gmail Send-As wizard.

**НЕ email marketing platform** — это domain email setup tool. Не пересекается с Mailkit s.r.o. (чешский ESP).

**Запрещённые self-descriptions:** email marketing platform, ESP, transactional email service, email infrastructure platform.

**Правильные:** email setup automation, domain email setup tool, Cloudflare Email Routing automation, Gmail Send-As setup wizard.

**Аудитория:** только пользователи с доменом на Cloudflare DNS. Не-технические SMB. Не обслуживаем GoDaddy/Namecheap/Squarespace без миграции CF.

**Tagline EN:** "Professional email on your domain — without the DNS headache."

**Never say:** "0 clicks", "full auto", "90% automation", "zero setup", "any domain", "5 minutes", "under 10 minutes".

**Value drivers:** 1) снять боль DNS/SMTP; 2) гарантия возврата; 3) дешевле Workspace ($5 vs $72/год); 4) без подписки; 5) Gmail остаётся.

Details: [docs/MARKETING_ANGLES.md](docs/MARKETING_ANGLES.md), [docs/GUARANTEE_POLICY.md](docs/GUARANTEE_POLICY.md), [docs/RISKS.md](docs/RISKS.md).

## Architecture constraints

- **Gmail `sendAs.create` заблокирован** на personal @gmail — нужен Workspace + domain delegation. MVP: 3-мин ручной шаг. Детали: [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md).
- **Postmark** — единственный SMTP backend. Transactional emails тоже через Postmark.
- **Brevo удалён.** Не реинтегрировать.
- **Resend удалён.** Не реинтегрировать.

## Stack

- Next.js 16 App Router + TypeScript strict
- Tailwind 4 + shadcn/ui
- next-intl (EN only — RU убран 2026-04-30)
- Supabase (auth + DB, RLS enabled)
- Lemon Squeezy payments (Stripe недоступен в KZ)
- Vercel, домен getmailkit.com

## Pricing

- $5 one-time (1 mailbox). Bundles — backlog.
- $3/mo deliverability monitoring (optional, post-launch).

## Работа с Boris

- **На «ты».** Никогда третье лицо.
- **Короткие ответы** (≤30 сек чтения). Без markdown в простых ответах.
- **«да/нет»-вопрос → одно слово.**
- **«ОК»/«давай»/«A»/«B» = команда.** Не обсуждать — делать.
- **Баги чинить сразу.** Читать файлы сразу. Не спрашивать «посмотреть?».
- **Запрещены:** «принял», «слышу», «окей», «verbatim», «жду».

## What NOT to do

- Не строить DNS checker / audit tool
- Не добавлять freemium / trials
- Не делать done-for-you сервисы
- Не трогать CF/Postmark/Gmail код без чтения [docs/SPIKE_FINDINGS.md](docs/SPIKE_FINDINGS.md)
- Не строить live chat — только email support

## UI Verification

**Playwright/браузер — ТОЛЬКО для вопросов про дизайн/вёрстку/визуал** (как что-то выглядит, layout, responsive, контраст, наличие элемента). На НЕ-UI задачах (правка href/ссылок, логика, факты, значения, копи-текст, конфиг, «так ли по коду») браузер НЕ поднимать — это жжёт время Boris; проверять чтением кода + `pnpm typecheck`.

После изменений UI — `pnpm dev` + Playwright screenshot перед показом Boris. Playwright МОЖЕТ: layout, responsive, формы, навигация, console errors. Playwright НЕ МОЖЕТ: Google OAuth, реальный LS checkout, реальные API calls с ключами.
