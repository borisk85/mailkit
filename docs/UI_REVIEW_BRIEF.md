# MailKit — UI/UX Review Brief (one-shot premium pass)

Архитекторский документ с финальными правками дизайна и копи перед
запуском. Документ создан после ревизии 180 скриншотов из
`docs/ui-review/`. Содержит правки на премиум-уровень в стиле топов
SaaS 2026 года (Linear, Stripe, Vercel, Resend, Notion). Реализуется
одной веткой `feat/ui-premium-pass`, без последующих итераций — один
выстрел.

Структура документа:
1. Дизайн-система — общий язык для всех страниц
2. Лендинг секция за секцией
3. App pages — Dashboard, Setup Wizard, Gmail Wizard
4. Legal pages — Terms, Privacy, Guarantee
5. Email templates — HTML wrappers для транзакционных писем
6. Edge states — error, empty, loading, 404
7. Анти-паттерны — чего избегать

---

## 1. Дизайн-система

### 1.1 Цветовая палитра

Полный пересмотр текущей палитры. Уход от плоского indigo-violet
gradient в сторону монохромной базы с одним строгим accent-цветом.
Тренд 2026: меньше градиентов, больше чёткой типографики и pure colors.

**Dark mode (primary, default):**
- Background base: `#0A0A0B` (почти-чёрный с лёгким тёплым подтоном)
- Background elevated (cards, modals): `#131314`
- Border subtle: `#1F1F22`
- Border strong: `#2A2A2F`
- Text primary: `#FAFAFA`
- Text secondary: `#A1A1AA`
- Text tertiary: `#71717A`
- Accent primary: `#7C5CFF` (фиолетовый, насыщеннее текущего)
- Accent hover: `#8B6FFF`
- Accent text: `#FFFFFF` (на accent background)
- Success: `#22C55E`
- Warning: `#F59E0B`
- Danger: `#EF4444`

**Light mode:**
- Background base: `#FAFAFA`
- Background elevated: `#FFFFFF`
- Border subtle: `#E4E4E7`
- Border strong: `#D4D4D8`
- Text primary: `#0A0A0B`
- Text secondary: `#52525B`
- Text tertiary: `#71717A`
- Accent primary: `#7C5CFF`
- Accent hover: `#6B4FE6`
- Accent text: `#FFFFFF`

Убрать gradient blue→purple на CTA-кнопках. Один цвет `#7C5CFF`,
hover state — чуть светлее. Gradient визуально устарел в 2026 году
для премиум-SaaS (Linear убрал gradients, Vercel убрал, Stripe только
тонкий ambient в декоративных элементах). Solid colors читаются
дороже.

### 1.2 Типографика

Текущий Geist Sans оставляем — это правильный выбор для премиум-SaaS.
Но усиливаем иерархию.

**Шкала:**
- Display 1 (hero headline): `Geist Sans 88px / 96px line-height / -0.04em letter-spacing / weight 600`
- Display 2 (section headlines): `Geist Sans 56px / 64px / -0.03em / weight 600`
- Heading 1: `Geist Sans 40px / 48px / -0.02em / weight 600`
- Heading 2: `Geist Sans 32px / 40px / -0.02em / weight 600`
- Heading 3 (subhead): `Geist Sans 24px / 32px / -0.01em / weight 600`
- Body large: `Geist Sans 20px / 32px / weight 400`
- Body regular: `Geist Sans 17px / 28px / weight 400`
- Body small: `Geist Sans 15px / 24px / weight 400`
- Caption: `Geist Sans 13px / 20px / weight 500`
- Mono (для domain examples, code snippets): `Geist Mono 16px / 24px`

Mobile breakpoint (под 768px): уменьшение Display 1 до 56px,
Display 2 до 36px, остальное как есть.

Tight letter-spacing на больших display sizes — это ключевая премиум-
характеристика. Без отрицательного tracking на 88px заголовок выглядит
как обычный жирный текст вместо premium typography.

### 1.3 Spacing (вертикальные отступы)

Унифицируем секции лендинга:
- Между секциями (section gap): `120px desktop / 80px mobile`
- Внутри секции (заголовок → содержимое): `64px desktop / 40px mobile`
- Между подсекциями: `48px / 32px`
- Текстовые блоки: `24px между параграфами`
- Cards padding: `32px desktop / 24px mobile`

Сейчас секции разделены неравномерными отступами, выглядит как
неаккуратная вёрстка. Унифицированная система — premium-сигнал.

### 1.4 Motion

Минимально и аккуратно:
- Section reveal on scroll: `opacity 0→1 + translateY 12px→0 / 600ms / easing cubic-bezier(0.16, 1, 0.3, 1)`
- Button hover: `scale 1→1.01 / 150ms / ease-out` плюс легкий lift через box-shadow
- Card hover: `border-color subtle → strong / 200ms`
- Link underline: `text-decoration animation 200ms`
- Никаких parallax, particle effects, mouse-follow эффектов

Motion должен ощущаться как часть продукта а не как развлечение.
Современный премиум-стандарт — motion почти невидим но создаёт
ощущение качества при микро-взаимодействиях.

### 1.5 Shadows и elevation

Дробная система shadows вместо одного box-shadow:
- Card subtle (default): `0 1px 2px rgba(0,0,0,0.04), 0 0 0 1px rgba(255,255,255,0.06)` (на dark) / `0 1px 2px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)` (на light)
- Card hover: добавляем `0 8px 24px rgba(0,0,0,0.12)`
- CTA button: `0 1px 0 rgba(255,255,255,0.08) inset, 0 4px 12px rgba(124,92,255,0.24)` (даёт визуальный glow вокруг accent)
- Modal/Dialog: `0 24px 64px rgba(0,0,0,0.32)`

### 1.6 Borders и corner radius

- Cards: `border-radius 16px` (текущие 12px ощущаются мелко)
- Buttons: `border-radius 10px`
- Inputs: `border-radius 10px`
- Pills/badges: `border-radius 999px` (full pill)
- Code blocks: `border-radius 8px`

Унифицированные corner radius по системе — premium signal.
Несогласованные corner radius выглядят как несвязанные компоненты.

---

## 2. Лендинг — секция за секцией

### 2.1 Announcement banner

Текущий — кричащий красно-оранжевый прямоугольник по всей ширине
сверху. Ломает premium с первой секунды. Полностью переделать.

**Новый дизайн:**
- Тонкая полоса, высота `36px` (текущая выглядит как 56-60)
- Background: `rgba(124, 92, 255, 0.08)` — едва видный wash в accent цвете
- Текст: `Body small / weight 500 / text-secondary`
- Контент: иконка `Sparkle` (lucide-react) `size 14, opacity 0.7` + текст "Launch week — first 100 setups free with promo FIRST100" + ссылка "See how →" (underline on hover)
- Dismiss крестик: `size 14 / opacity 0.5 / hover opacity 1`
- Border-bottom: `1px solid border-subtle`

**RU копи:** "Launch week — первые 100 настроек бесплатно по промокоду FIRST100"

Цель — присутствует но не доминирует. Текущая красная полоса доминирует.

### 2.2 Header

Текущий header нормальный по структуре. Минорные правки:

- Уменьшить высоту до `64px` (visually tighter)
- Logo lockup: иконка `28×28` + wordmark `Geist Sans 18px / weight 600 / -0.02em tracking`
- Nav links: `Body small / weight 500 / text-secondary` — на hover становятся text-primary
- Language switcher: текущий `Globe + EN/RU` ОК, но flag иконки можно убрать если они есть, оставить только текстовые лейблы
- Theme toggle: одна иконка `Sun/Moon` без border (text-tertiary, hover text-secondary)
- Sign in button: text link, не button. `Body small / weight 500 / text-secondary` плюс `→` на hover
- Backdrop blur при scroll: `backdrop-blur-md` плюс `bg-base/80` (полупрозрачный с blur)
- Border-bottom при scrolled: `1px solid border-subtle`

### 2.3 Hero — полная переделка

**Текущее состояние:** слева текст и кнопка, справа какие-то неясные
карточки/табы с малым контрастом. Нет ощущения продукта. Headline
просто текст без визуального якоря.

**Новый дизайн:**

**Layout:** ассиметричная сетка `7/5` columns (left content 7 columns,
right visual 5 columns). Не центрированный, не 50/50 — это устаревшая
структура. Современные Linear/Vercel используют ассиметрию для лучшего
визуального баланса.

**Левая колонка:**

Eyebrow label сверху над заголовком: `Body small / weight 500 / accent color / uppercase / tracking 0.08em`
> "Email infrastructure for indie makers and small teams"
> RU: "Почтовая инфраструктура для инди-мейкеров и малых команд"

Headline (Display 1):
> "Your email. Your domain. Five minutes."
> RU: "Твоя почта. Твой домен. Пять минут."

Не "Email on your domain in 5 minutes" — это generic SaaS template
phrase. Новый headline ритмичнее (три коротких фразы), эмоциональнее,
выделяет ключевой benefit. Каждая фраза на отдельной строке через
`<br>`, последняя — `text-secondary` чтобы создать визуальный rhythm.

Subhead (Body large) после headline на отступе 24px:
> "We configure Cloudflare, Brevo, and DKIM/SPF/DMARC records.
> You copy-paste four lines into Gmail. That's the whole product."
> RU: "Мы настраиваем Cloudflare, Brevo, DKIM/SPF/DMARC записи.
> Ты копируешь четыре строки в Gmail. Это весь продукт."

Прямой, конкретный. Не "We automate the technical complexity" —
это водянистый corporate-speak. Конкретные имена сервисов и записей —
сразу даёт доверие технической аудитории, не отпугивает SMB.

CTA pair (32px отступ от subhead):
- Primary button: `Get your email — $5` / `Настроить почту — $5` (Heading 3 weight 600, height 52px, padding 0 28px, accent background, white text, full corner radius 10px, signature accent shadow). Иконка `→ ArrowRight` справа от текста через 8px.
- Secondary text link: `See how it works →` / `Как это работает →` (Body regular weight 500 text-secondary, hover text-primary, underline animation on hover). Без button-стиля, чисто текстовая ссылка.

Под CTA-парой — trust microcopy (Caption, text-tertiary, 16px отступ):
> "30-day money-back. Auto-refund if our setup fails."
> RU: "Возврат денег 30 дней. Авто-возврат при сбое настройки."

**Правая колонка — продукт-визуал:**

Это критический gap текущего лендинга. Без живого продукт-shot
премиум-эффект невозможен. Создаём stylized Gmail Compose mockup:

- Container: `border-radius 16px / border 1px solid border-strong / padding 24px / background elevated`
- Внутри стилизованная Gmail Compose window (упрощённая версия настоящего интерфейса):
  - Toolbar строка сверху с серыми placeholder-кнопками
  - Поле "From:" — выпадающий список с тремя вариантами:
    - `john.doe@gmail.com` (с серым checkmark, "Default")
    - `hello@yourdomain.com` (highlighted with accent border, accent ring, чтобы привлечь взгляд) ← это наш value
    - `hi@yourdomain.com` (тоже с accent)
  - Под From: поле "To:" с placeholder text
  - Subject placeholder
  - Body area placeholder
  - "Send" button синий внизу (стилизованный Gmail send button)

Mockup на лёгком 3D-перспектив (через CSS transform `rotateY(-4deg) rotateX(2deg)`) — тонкий tilt создающий ощущение объёма. Не плоский. Linear-стиль.

Под mockup'ом decorative ambient glow `radial-gradient(at top right, rgba(124,92,255,0.16), transparent 60%)` — создаёт визуальный "glow" вокруг продукта.

На mobile mockup стэкается под текстом, упрощается (без перспективы, без glow).

### 2.4 Logos bar (текущий "Integrations bar")

Сразу под hero, разделитель `1px border-top, padding 80px 0`.

**Новый дизайн:**

Eyebrow centered: `Body small / text-tertiary / uppercase tracking 0.08em`
> "Built on infrastructure trusted by millions"
> RU: "Построено на инфраструктуре, которой доверяют миллионы"

Под ним — реальные logos в monochrome (ВСЕ серого text-tertiary
цвета без brand-colors):
- Cloudflare (lucide-react `Cloud` icon + текст "Cloudflare")
- Brevo (custom SVG monogram + текст "Brevo")
- Gmail (custom envelope SVG + текст "Gmail")
- Google (Google G monochrome + текст "Google OAuth")
- Lemon Squeezy (lemon icon + текст "Lemon Squeezy")

Размер каждого: `height 32px`. Между ними `gap 64px desktop / wrap on mobile`.

На hover каждого — translates вверх 2px и opacity 1 (с 0.7).

Зачем 5 логотипов вместо 3: trust building. Чем больше известных
брендов в нашей цепочке, тем более надёжно выглядим. Stripe pattern.

### 2.5 Problem section — полная переделка

Текущее: две колонки текста "Without/With MailKit". Без визуальной
иерархии, выглядит как два списка.

**Новый дизайн:**

Eyebrow label (centered):
> "The problem"
> RU: "Проблема"

Headline (Display 2, centered, max-width 800px):
> "Setting up email on your own domain is a 90-minute headache."
> RU: "Настроить почту на своём домене — это головная боль на 90 минут."

Subhead (Body large, centered, max-width 640px, text-secondary):
> "Five tabs open. Three documentation portals. One typo in SPF and you start over."
> RU: "Пять вкладок открыто. Три портала документации. Одна опечатка в SPF — начинай заново."

Под текстом, разделитель `48px`, два блока side-by-side:

**Left block — "DIY route" (приглушенный warning тон):**
- Card padding 32px / background elevated / border-radius 16px / border 1px solid border-subtle
- Top row: иконка `Clock` (lucide-react, size 24, text-tertiary) + label "Manual setup" + display number `60-90 min` (Display 2 / weight 700)
- Список из 5 шагов с малым текстом `Body small / text-tertiary` каждый шаг с `•` маркером:
  - Research routing services
  - Read Brevo SMTP docs (twice)
  - Hand-write five DNS records
  - Debug DKIM verification
  - Configure Gmail Send-As manually
- Каждый шаг подсвечен слабым red `rgba(239,68,68,0.08)` фоном при hover, чтобы показать "проблемность"

**Right block — "MailKit route":**
- Card padding 32px / background elevated / border-radius 16px / border 2px solid accent (highlighted)
- Top row: иконка `Zap` или `Sparkles` (size 24, accent color) + label "Automated" + display number `5 min` (Display 2 / weight 700 / accent color)
- Список из 4 шагов:
  - Sign in with Google
  - Paste Cloudflare token
  - Watch automation run (~90 sec)
  - Copy four lines into Gmail
- Каждый шаг с green check icon `text-success size 16` слева

Разделитель между блоками — vertical line `1px border-strong` или
просто gap 32px без разделителя.

На mobile блоки стэкаются вертикально с 24px gap.

### 2.6 How it works — полная переделка

Текущее: три карточки одинакового размера, выглядят как обычный feature
grid без визуального процесса.

**Новый дизайн:**

Eyebrow:
> "How it works"
> RU: "Как это работает"

Headline (Display 2):
> "Three automated steps. One you do yourself."
> RU: "Три автоматических шага. Один — твой."

Subhead (Body large, text-secondary, max 640px):
> "Total time under 5 minutes. Total work on your side: four copy-paste actions."
> RU: "Полное время — меньше 5 минут. Твоя работа — четыре copy-paste."

Под текстом — горизонтальная timeline с 4 шагами (не 3, добавляем
Gmail Send-As как отдельный шаг чтобы быть честными):

```
[01]  ─────  [02]  ─────  [03]  ─────  [04]
CF Email      Brevo       DNS         Gmail
Routing       SMTP        verify      Send-As
~15 sec       ~60 sec     ~30 sec     ~3 min
```

Линия между шагами — gradient `from accent to accent transparent at end`,
showing flow direction.

Каждый шаг — card 240px width:
- Шаг номер `[01]` `[02]` `[03]` крупно сверху (Heading 1 weight 700 / accent color)
- Иконка соответствующего сервиса (Cloudflare/Brevo/MailKit/Gmail) size 32 monochrome
- Title (Heading 3): "Cloudflare Email Routing" / "Brevo SMTP setup" / "DNS verification" / "Gmail Send-As"
- Time pill (Caption / accent background 0.12 opacity / accent text / 6px padding): "~15 sec"
- Description (Body small / text-secondary / 4 строки максимум):
  - 1: "We enable Email Routing on your domain and write the MX record. You don't see Brevo at all."
  - 2: "We claim your domain in our shared Brevo account, write DKIM and brevo-code records."
  - 3: "We verify SPF passes, DKIM signs correctly, DMARC alignment is OK."
  - 4: "We hand you four lines: SMTP server, port, login, password. You paste into Gmail Settings."
- Шаги 1-3 имеют дополнительный pill `Automated` (success-colored)
- Шаг 4 имеет pill `Your turn` (accent-colored) — визуально отделяет

На mobile timeline трансформируется в вертикальный stack, линия становится вертикальной.

### 2.7 Pricing section

Текущий — центрированная card с большим $5. Структурно ОК, но
выглядит изолированно от остального. Добавляем context.

**Новый дизайн:**

Eyebrow:
> "Pricing"
> RU: "Цена"

Headline (Display 2):
> "Five dollars. One time. Done."
> RU: "Пять долларов. Один раз. Всё."

Subhead (Body large, text-secondary):
> "No subscription. No recurring fee. No surprise charges next month."
> RU: "Без подписки. Без ежемесячного платежа. Без сюрпризов через месяц."

Под subhead — pricing card centered, max-width 480px:
- Background elevated с border-strong (выделение через сильный border, не gradient)
- Padding 40px
- Border-radius 20px
- Top row: pill `MAILKIT SETUP` (Caption / text-tertiary / uppercase / tracking 0.08em)
- Display 1 цена: `$5` (Display 1 / weight 700 / text-primary) + `one-time` (Body large / text-tertiary / в той же строке)
- Divider 1px border-subtle / 24px gap
- Включения list (5-7 пунктов):
  - check: Cloudflare Email Routing setup
  - check: Brevo SMTP authentication (DKIM, SPF, DMARC)
  - check: Guided Gmail Send-As wizard
  - check: Unlimited free aliases on your domain
  - check: 30-day money-back guarantee
  - check: Auto-refund if our setup fails
- CTA primary button (full-width в card): `Get your email — $5`
- Под кнопкой microcopy (Caption / text-tertiary / centered):
  - "Powered by Lemon Squeezy. Stripe, Apple Pay, Google Pay accepted."

Сравнение с конкурентами в строке под card (centered text):
> "Compare: Google Workspace $6/user/mo. ImprovMX $9/mo. MailKit $5 once."
> RU: "Для сравнения: Google Workspace $6/пользователь/мес. ImprovMX $9/мес. MailKit $5 разово."

Этот ряд — мощный социально-конкурентный аргумент. Сейчас отсутствует
полностью. Premium SaaS landings почти всегда показывают сравнение с
конкурентами.

### 2.8 Trust + guarantee section

Текущее: секция "Backed by a real guarantee" с тремя колонками текста.
Слабый заголовок, мелкий текст.

**Новый дизайн:**

Eyebrow:
> "Guarantees"
> RU: "Гарантии"

Headline (Display 2):
> "We refund first, ask questions later."
> RU: "Сначала возвращаем деньги, потом задаём вопросы."

Subhead (Body large, text-secondary):
> "Two-tier guarantee that does the talking, not the marketing."
> RU: "Двухуровневая гарантия, которая работает за нас, а не маркетинг."

Под subhead — два больших блока side-by-side (не 3, концентрируем на
самом важном):

**Block 1 — Automation guarantee:**
- Иконка `Zap` size 32 / accent color
- Heading 2: "Automation failure"
- Body regular: "If our automated setup fails on our end (Cloudflare or Brevo phase) — full refund within 24 hours. Automatic. No request needed."
- Pill `Auto-refund` (success bg / success text)

**Block 2 — Functional guarantee:**
- Иконка `Shield` size 32 / accent color
- Heading 2: "30-day functional"
- Body regular: "If within 30 days you can't actually send email through your domain — even after our support — full refund on request. Just email us."
- Pill `30-day` (info bg / info text)

Под этими блоками — link "Read full policy →" на /guarantee.

Удаляем текущую "We handle tech, you do 3 clicks" — это маркетинговая
фраза которая ломает honest positioning. Вместо этого включаем factual
language.

### 2.9 FAQ section

Текущее: accordion с 19 вопросами. Слишком много на одной странице,
выглядит как FAQ-stuffing для SEO.

**Новый дизайн:**

Eyebrow:
> "Common questions"
> RU: "Частые вопросы"

Headline (Display 2):
> "Everything you'd ask before paying $5."
> RU: "Всё, что ты спросишь перед тем как заплатить $5."

Сократить до 10 ключевых вопросов (отсортировать по importance,
оставить топ-10). Архитектор пройдёт по `messages/{en,ru}.json`
namespace `landing.faq.*` и пометит какие 10 оставлять — это будет
отдельным sub-task разработчика, но базовый набор такой:

1. "Can I do this myself for free?" — да за 90 мин, мы за 5
2. "Why $5 one-time vs Workspace $6/mo?" — мы дополняем Gmail, не заменяем
3. "What if it breaks after setup?" — 30-day functional guarantee
4. "Is the Gmail step really not automated?" — честно: нет на личных Gmail, Google API ограничение
5. "What domains work?" — любые на Cloudflare DNS
6. "Why my emails go to spam?" — это уже разносится sender reputation, не наша часть
7. "Is my Cloudflare token safe?" — используется и удаляется
8. "Can I cancel anytime?" — нет рекуррента, нечего отменять
9. "How is this different from ImprovMX?" — у них нет Send-As setup
10. "Do you support team Workspace?" — нет, это другой продукт

**Layout:**
- Accordion `<details><summary>` (текущая реализация ОК)
- Padding 24px на каждый item
- Hover background subtle elevated
- Open state: subtle accent left border (3px width)
- Question (Heading 3, weight 600)
- Answer (Body regular, text-secondary, max-width prose 65ch)
- Между items 8px gap
- Иконка chevron справа `ChevronDown` size 16 / text-tertiary / rotates 180deg on open

### 2.10 Final CTA section

Текущее: "Ready when you are" — слабый заголовок.

**Новый дизайн:**

Centered block, max-width 720px, padding 120px 0:

Eyebrow:
> "Ready"
> RU: "Готов"

Display 1 headline:
> "Five minutes from now, you'll have email on your domain."
> RU: "Через пять минут у тебя будет почта на домене."

Subhead (Body large, text-secondary):
> "Or your money back, automatically. No tickets, no calls, no questions."
> RU: "Или возврат денег, автоматически. Без тикетов, без звонков, без вопросов."

Под subhead, 32px gap, CTA pair:
- Primary button (size larger чем в hero, height 60px / padding 0 36px / Heading 3 weight 600 text): `Get your email — $5`
- Secondary text link: `Read the guarantee first` → /guarantee

Под ними — каноничный trust row (Body small, text-tertiary, centered, gap 16px):
- ✓ Money-back guarantee
- ✓ No subscription
- ✓ Setup in minutes
- ✓ Cancel anytime (alias deletion)

Background: thin accent gradient ambient `radial-gradient(at center, rgba(124,92,255,0.06), transparent 70%)` — едва заметный glow.

### 2.11 Footer

Текущий footer виден как маленький блок в конце, скорее всего
типичный 3-column. Премиум footer более presence:

**Layout:** 5 columns на desktop, stack на mobile.

**Column 1 (wide, 2/5 ширины):**
- Logo (icon + wordmark) size 32
- Tagline (Body small, text-tertiary): "Email on your domain. In 5 minutes. Guaranteed."
- Social row: X icon, GitHub icon (если public), small Telegram icon (для RU аудитории)
- Copyright (Caption, text-tertiary): "© 2026 MailKit. Built by an indie hacker."

**Column 2 — Product:**
- How it works (anchor)
- Pricing (anchor)
- FAQ (anchor)
- Sign in (link)

**Column 3 — Legal:**
- Terms of Service (/terms)
- Privacy Policy (/privacy)
- Guarantee (/guarantee)
- Security (/security если будет)

**Column 4 — Resources (post-launch):**
- Help (/help)
- Status (/status)
- Changelog (/changelog)
- Blog (/blog)

**Column 5 — Contact:**
- support@getmailkit.com
- Twitter @mailkit (если будет)
- Telegram @mailkit_dev (для RU)

Footer background `bg-elevated` для лёгкого визуального отделения.
Padding 80px 0 / border-top 1px subtle.

---

## 3. App pages

### 3.1 App Dashboard (/app)

Текущий dashboard функциональный — список покупок, статус настроек,
ссылки. Применяем общую дизайн-систему: те же spacing, typography,
colors. Не переделываем структуру, делаем визуально согласованным с
лендингом.

**Specific tweaks:**
- AppHeader использует тот же header pattern что лендинг, но без nav
  (только logo, theme toggle, lang switcher, account menu справа)
- Dashboard sections с заголовками Heading 2
- Пустые состояния — добавить иллюстративный элемент (subtle ambient
  shape или иконку size 48 в text-tertiary) над заголовком empty state
- Loading skeletons вместо spinner — `1px solid border-subtle / background elevated / animate-pulse`
- Status badges (paid / refunded / failed): pill style с соответствующим
  цветом каждого статуса

### 3.2 Setup Wizard (/app/setup)

Применяем дизайн-систему. Структура существующая нормальная (steps с
прогресс-list).

**Specific tweaks:**
- Шаги в progress list — иконки заменяем на `Loader2 / CheckCircle2 / XCircle / Circle` из lucide-react с правильным цветом каждого state
- Active step: accent border-left 3px, лёгкий accent background tint
- Completed step: success border-left 3px
- Failed step: danger border-left 3px
- Между шагами — 8px gap
- Heading на странице (Heading 1): "Set up email on your domain"
- Eyebrow: "Step 1 of 4 — Cloudflare token"

### 3.3 Gmail Wizard

Текущее состояние — text-only steps без визуальных подсказок. Это
один из самых критичных gaps.

**Что добавить:**

Каждый шаг получает inline-mini-illustration (SVG schematic, не real
Gmail screenshot — пока). Schematic должен быть стилизован под наш
brand:
- Step 1 "Open Gmail Settings": SVG настольных gears + chevron arrow
- Step 2 "Add address": SVG gmail email-adding form schematic с placeholder fields подсвечен accent цветом для нашего email
- Step 3 "Configure SMTP": SVG SMTP form schematic с подсвеченными полями server/port/login/password
- Step 4 "Verify": SVG envelope letter с tick mark
- Step 5 "Send test": SVG "Compose" window mockup с From dropdown подсвечен на нашем email
- Step 6 "Done": SVG success card с green check

Каждый schematic должен быть `width 100% / max-width 480px / aspect-ratio 16/9 / border 1px subtle / border-radius 12px / background elevated / padding 24px`.

Real Gmail screenshots — оставляем для post-launch итерации, сейчас
schematic SVG достаточно для professional ощущения.

Каждый шаг имеет:
- Step number badge (Heading 3 / weight 700 / accent color): "Step 1"
- Title (Heading 2): "Open Gmail Settings"
- Description (Body regular, max-width prose)
- Inline schematic (если применимо)
- Copy-paste fields (если шаг 2-3 с реквизитами) — каждое поле в собственной card с copy button и monospace font для значения
- Action button next to advance

Copy-paste fields styling:
- Background: elevated++
- Border: subtle с accent left-border (3px)
- Padding: 16px
- Label (Caption): "SMTP Server"
- Value (Mono / 16px / weight 500): `smtp-relay.brevo.com`
- Copy button: `Copy` icon (lucide) с tooltip "Copy"
- On click — иконка меняется на `Check` 1.5 sec, плюс toast "Copied!"

---

## 4. Legal pages — Terms, Privacy, Guarantee

Применяем typography systematic, prose styling:
- Container max-width 720px (читабельная prose линия)
- Heading hierarchy: H1 для названия документа, H2 для секций, H3 для подсекций
- Body regular для основного текста, line-height 28px для prose readability
- Code/technical terms в Mono inline
- Bullet lists с custom marker (• instead of disc bullet)
- Между секциями 48px gap
- TOC sidebar на desktop (sticky, links к каждой секции с anchor scroll)
- На mobile TOC превращается в sticky dropdown сверху
- "Last updated: 2026-04-25" — pill badge style (Caption / text-tertiary / border 1px subtle)

Это даёт legal pages читабельность долгого документа на уровне Stripe
docs / Notion docs.

---

## 5. Email templates

Текущие emails в plain text. Минимум — обернуть в HTML wrapper для
профессионального вида в inbox. Не делаем сложные templates — простой
brand-consistent wrapper.

**Wrapper structure:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width">
  <style>
    /* Inline styles only — email clients */
    body { font-family: -apple-system, system-ui, sans-serif; background: #FAFAFA; margin: 0; padding: 32px 16px; }
    .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; }
    .logo { width: 120px; margin-bottom: 32px; }
    h1 { font-size: 24px; font-weight: 600; color: #0A0A0B; margin: 0 0 16px; line-height: 1.3; }
    p { font-size: 16px; line-height: 1.6; color: #52525B; margin: 0 0 16px; }
    .button { display: inline-block; background: #7C5CFF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 15px; margin: 16px 0; }
    .footer { margin-top: 40px; padding-top: 24px; border-top: 1px solid #E4E4E7; }
    .footer p { font-size: 13px; color: #71717A; }
    .footer a { color: #71717A; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <img src="https://getmailkit.com/brand/mailkit-logo-full.png" class="logo" alt="MailKit">
    <h1>{{TITLE}}</h1>
    <p>{{BODY}}</p>
    {{CTA_BUTTON}}
    <div class="footer">
      <p>Questions? Reply to this email or write to support@getmailkit.com</p>
      <p>
        <a href="https://getmailkit.com/terms">Terms</a> ·
        <a href="https://getmailkit.com/privacy">Privacy</a> ·
        <a href="https://getmailkit.com/guarantee">Guarantee</a>
      </p>
    </div>
  </div>
</body>
</html>
```

Применяется к: refund email, send-limit-block email, deliverability-suspend email, deliverability-warn email. Если post-launch добавится welcome/success — тот же wrapper.

Тексты писем оставляем как есть (они уже подготовлены) — только оборачиваем в HTML.

---

## 6. Edge states

### 6.1 Cookie consent banner

Текущий — slide-up banner. Применяем дизайн-систему:
- Position: fixed bottom-right на desktop (520px max-width), полная ширина на mobile
- Background: elevated с backdrop-blur и border-strong
- Padding: 24px
- Border-radius: 16px
- Margin: 24px from edges
- Текст (Body small): "We use only essential cookies for sign-in and language. No tracking, no ads."
- RU: "Используем только необходимые куки для входа и языка. Без трекинга, без рекламы."
- Two buttons: `Accept` (primary, smaller) и `Read more` (text link → /privacy)

### 6.2 Error boundary

Текущий — есть, обновляем typography и spacing согласно дизайн-системе.
Иконка `AlertTriangle` size 48 text-warning в верху, Heading 1 заголовок,
Body regular описание, retry button + home link.

### 6.3 404 (отложено per директивы, но если делаем):

Минимально:
- Display 1: "404"
- Heading 2: "Page not found"
- Body: "The page you're looking for doesn't exist or has been moved."
- Primary button: "Back to home" → /
- Secondary link: "Contact support" → mailto

### 6.4 Empty states (Dashboard)

- Centered illustration area: 120px height ambient SVG shape (subtle gradient circle с soft glow в accent color, 0.08 opacity)
- Heading 2: "No setups yet"
- Body regular text-secondary: "Buy your first MailKit setup to start sending email from your domain."
- Primary button: "Set up your first domain" → /pricing

### 6.5 Loading skeletons (Dashboard)

- Replace spinners with skeleton cards
- Skeleton: `background border-subtle / animate-pulse / border-radius matching real component`
- Show 3 placeholder cards while loading purchases history

---

## 7. Анти-паттерны (чего НЕ делать)

- Никаких больших градиентов на CTA. Solid colors only. Gradient устарел в 2026.
- Никаких stock illustrations / undraw картинок. Если нет реального ассета — лучше pure typography с правильной иерархией.
- Никаких animated background particles, mouse-followers, parallax. Premium = sober.
- Никаких "Trusted by 10,000+ companies" фраз без доказательств. Мы запускаемся с 0 клиентами, честно говорим "Built by an indie hacker. Be customer #1."
- Никаких "Award-winning" или "Industry-leading" фраз — мы не такие, не врать.
- Никаких излишних eyebrow labels на каждой секции — только где смысл.
- Никаких неконкретных subhead-ов типа "We're passionate about your success". Конкретные числа, факты, выгоды.
- Никаких confetti / celebration animations при успешных действиях. Один subtle check + toast достаточно.
- Никаких light mode форсированно ярких колорfull elements. Light mode тоже должен быть монохромным с одним accent.
- Никаких разноцветных logos в integrations bar. Все monochrome для visual consistency.

---

## 7.5 Brand assets — Logo и Favicon (REVISED 2026-04-28)

**Note:** изначальная версия секции 7.5 предлагала заменить envelope
на монограмму "M". Owner отметил что логотип-envelope уже согласован
через Ideogram (Variant 2 с blue-purple gradient envelope) и архив
brand работ есть. Откатываю замену. Envelope остаётся, фиксим только
интеграцию в navbar и favicon оптимизацию.

### Текущее состояние

См. `docs/ui-review/header/header-en-1920.png` и
`docs/ui-review/favicon/browser-tab.png`.

**Header logo lockup проблемы:**
- Иконка envelope в navbar выглядит размытой при retina rendering —
  скорее всего используется PNG raster вместо SVG.
- После wordmark "Mailkit" присутствует accent dot — этого dot не
  было в исходном Ideogram логотипе, добавлен при интеграции в код.
  Избыточный элемент, убираем.
- Иконка занимает несоразмерно много вертикального пространства,
  перетягивает внимание от wordmark.

**Favicon проблемы:**
- На 16×16 internal flap-line детализация envelope не различима,
  читается как простой синий квадрат с непонятным силуэтом.
- На 32×32 нормально, но без оптимизации для маленького размера —
  тот же raster даунскейл.

### Правки

**Logo lockup в Header компоненте:**

- Конвертировать `public/brand/mailkit-icon.png` в SVG-исходник
  `public/brand/mailkit-icon.svg`. Если оригинальный SVG из Ideogram
  не сохранён — векторизовать существующий PNG через trace tool
  (Adobe Illustrator Image Trace, Inkscape Trace Bitmap, либо
  vectormagic.com). Цель — чёткий вектор для retina rendering.
- В `<Image>` или `<svg>` теге Header заменить PNG на SVG.
- Размер иконки в lockup: 24×24 (текущий ~32 слишком большой).
- Убрать accent dot после wordmark "Mailkit" — этого dot нет в
  Ideogram-исходнике, лишний элемент.
- Wordmark "Mailkit" остаётся как есть (Capital M, не lowercase) —
  это часть Ideogram-варианта который уже согласован.
- Gap между иконкой и wordmark: 10px.

**Favicon оптимизация:**

Двухуровневая стратегия — детальный envelope для размеров 32+ и
упрощённый pixel-art для 16×16:

1. Источники для размеров 32, 48, 64, 96, 128, 192, 256, 384, 512:
   - Использовать существующий `mailkit-icon.svg` (после векторизации
     из пункта выше)
   - Регенерировать через sharp с качественным даунскейлом
   - На этих размерах детализация flap-line читается нормально

2. Источник для 16×16:
   - Создать отдельный `public/brand/mailkit-icon-16.png` —
     pixel-art версия envelope без внутренней flap-line
   - Шаблон 16×16 grid: violet rounded rectangle 14×11 (с 1px padding
     по сторонам и 2-3px сверху/снизу) с белой диагональной линией
     одной (только верхний flap), без accent dot внутри
   - Это специально упрощённая версия для micro-размера, не downscale
   - Файл подключается отдельно в `<link rel="icon" sizes="16x16">`

3. apple-touch-icon 180×180:
   - Полная детализация envelope
   - Background не transparent, а solid (например тот же violet с
     сlight rounded corners) — iOS автоматически закругляет

4. favicon.ico multi-size:
   - Embedded 16/32/48 — 16 это pixel-art, 32 и 48 это нормальный
     даунскейл из SVG

5. В `app/[locale]/layout.tsx` `generateMetadata` обновить refs на
   все эти варианты с правильными sizes attribute.

### Email шаблоны (отсылка к секции 5)

В HTML wrapper'е email шаблонов logo URL должен указывать на полную
горизонтальную версию `public/brand/mailkit-logo-full.png` (envelope +
wordmark). Этот файл уже существует, ничего не пересоздаём — это
оригинальный Ideogram горизонтальный lockup используемый для
publication context'ов где нужен full brand.

OG image и social cards (когда дойдём post-launch) — также используют
полную горизонтальную версию.

### Старые brand assets

`public/brand/mailkit-icon.png` остаётся как fallback для случаев где
SVG не поддерживается (старые email клиенты, некоторые legacy браузеры).
`public/brand/mailkit-logo-full.png` остаётся для email шаблонов и OG.
Новый `mailkit-icon.svg` добавляется как основной источник для веб-
рендеринга и favicon генерации.

## 8. Реализация

После ревизии существующих brand assets выявлены проблемы которые надо
фиксить отдельно от секций выше. Текущее состояние (см.
`docs/ui-review/header/` и `docs/ui-review/favicon/`):

**Текущий logo lockup:**
- Иконка envelope с gradient и accent dot внутри — слишком сложная,
  визуально читается как generic SaaS blue mail icon в стиле
  Asana/Monday/Front. Не distinctive.
- Wordmark "MailKit" с заглавной M плюс accent dot после wordmark —
  два accent элемента в одном lockup, избыточно.
- Иконка непропорционально большая относительно высоты header.

**Текущий favicon:**
- На 16×16 envelope с тонкими внутренними линиями нечитаем — просто
  синий квадрат с непонятным силуэтом.
- На 32×32 envelope разборчив но generic, не выделяется среди других
  email-сервисов в табе браузера.
- Используется тот же raster image с разной даунскейл-степенью —
  без оптимизации под маленькие размеры.

### Правки

**Logo lockup — Linear-style monogram approach:**

Полностью заменить envelope иконку на букву-монограмму "M":
- Иконка: 24×24 квадрат, corner-radius 6px, solid background `#7C5CFF`
  (наш accent), белая буква "M" (Geist Sans 16px / weight 700) точно
  центрирована
- Никакого gradient на иконке. Solid color.
- Никаких внутренних деталей кроме самой буквы.
- Wordmark: `mailkit` lowercase (не "MailKit") — Geist Sans 18px /
  weight 600 / -0.02em tracking / text-primary
- Gap между иконкой и wordmark: 10px
- Никакого accent dot после wordmark — убираем
- На dark theme иконка остаётся в accent color (заметно), на light
  theme — то же accent (хороший контраст).

Почему монограмма а не envelope:
- Linear, Vercel, Resend, Cursor, Pinecone — все используют
  buchstaben-mark вместо иконографических символов. Это премиум-сигнал
  2026 года.
- Envelope как символ email — visually generic, ассоциируется с
  consumer-почтой 2010-х (Outlook, Hotmail, Yahoo Mail).
- Монограмма "M" работает на всех размерах включая favicon 16×16, чего
  envelope не может.
- Brand consistency между header и favicon (одинаковая mark везде).

**Favicon — генерация из единого SVG-источника:**

Создать `public/brand/mailkit-mark.svg` — векторный исходник с тем же
монограмматическим mark что в header:
```svg
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" rx="14" fill="#7C5CFF"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
        fill="white" font-family="Geist Sans, system-ui, sans-serif"
        font-size="42" font-weight="700">M</text>
</svg>
```

Регенерировать favicon set через sharp или imagemagick:
- 16×16 (для tab strip)
- 32×32 (для bookmarks)
- 48×48 (Windows)
- 96×96 (Android)
- 192×192 (Android home screen)
- 256×256 (Windows Metro)
- 384×384, 512×512 (PWA, OG fallback)
- apple-touch-icon-180×180 (iOS — корнеры iOS закругляет автоматически
  но мы и так с rx=14 делаем skinny rounded square)
- favicon.ico (multi-size с 16/32/48 embedded)

На 16×16 буква "M" должна занимать примерно 10-11 пикселей высоты.
При генерации проверить что текст не уходит в анти-алиасинг каши —
если на 16px размывается, вручную создать pixel-art версию для 16×16
(quad pixel art "M" в 5×5 grid плюс 5px padding).

В `app/[locale]/layout.tsx` `generateMetadata` обновить favicon
references на новый набор:
- icon: `/favicon.ico`, `/favicon-16.png`, `/favicon-32.png`,
  `/favicon-192.png`, `/favicon-512.png`
- apple-touch-icon: `/apple-touch-icon.png`
- manifest: `/manifest.json` со всеми size variants для PWA

Также обновить `<Image>` или `<svg>` в Header компоненте на новый mark.
Если мы кэшировали старый logo PNG в `public/brand/mailkit-icon.png` —
заменить на новый или удалить вместе с обновлением references.

### Старые brand assets

`public/brand/mailkit-icon.png` и `public/brand/mailkit-logo-full.png` —
удалить или архивировать. Они были созданы в стиле envelope-mark
которая теперь deprecated. На замену — единый
`public/brand/mailkit-mark.svg` (источник) плюс генерированный
favicon set в `public/`.

Email шаблоны (секция 5) — также обновить logo URL на новый mark.
Использовать PNG-версию 240×64 для email клиентов которые не понимают
SVG: иконка 64×64 + wordmark "mailkit" в одной строке. Генерируется
тем же sharp скриптом.

OG image для социального шаринга (когда дойдём до неё post-launch) —
использовать тот же mark в большем размере (1200×630, accent
background, центрированная "M" 400px высоты + tagline под ней).

## 8. Реализация

**Ветка:** `feat/ui-premium-pass`

**Подход:**
- Один большой PR, не разбиваем на этапы
- Ветка от свежего main (после merge /guarantee страницы)
- Реализация по разделам этого документа: 1 (design system tokens) → 2 (landing) → 3 (app pages) → 4 (legal pages) → 5 (email templates) → 6 (edge states)
- Финальный Playwright проход по всем страницам на 5 viewport × 2 локали для regression check
- Lighthouse прогон на лендинге чтобы убедиться что не уронили performance

**Quality gates:**
- lint clean
- typecheck clean
- build clean
- все существующие тесты passing
- Lighthouse landing Perf ≥ 70 на обоих локалях (сохраняем уровень)

**Оценка:** 2-3 дня сконцентрированной разработки. Один проход без
итераций. После реализации — owner проверяет на preview URL и даёт
зелёный свет на merge либо точечные финальные правки.

**Что НЕ входит в этот PR:**
- Real Gmail screenshots (deferred per директивы 2026-04-25)
- OG images / Twitter cards (deferred)
- Custom 404 page (deferred but mentioned for guidelines если будет в этом проходе)
- Welcome / success transactional emails (deferred)
- Health check endpoint (deferred)

Эти пункты идут отдельными post-launch тикетами по сигналам.

---

## 9. Финал

После реализации этого документа лендинг и весь продукт встают на
премиум-уровень в эстетике Linear / Vercel / Stripe / Resend 2026
года. Это не доводка существующего — это структурный пересмотр
дизайна с заменой generic SaaS template на distinctive MailKit-look.

Архитектор пройдёт по результату на preview URL после реализации.
Финальные правки — точечные, не системные. Если что-то критично не
получилось — отдельная итерация по конкретным секциям.
