# MailKit — Demo Video Script

Сценарий для AI-generated demo video длительностью 60-75 секунд.
Концептуальный обзор, не детальный walkthrough. Подходит для генерации
через HeyGen, Synthesia, Runway, Descript, Pictory или эквивалент.

Создан 2026-04-28. Используется на лендинге (hero section либо отдельный
блок над pricing) и на Product Hunt launch day (gallery video).

---

## Спецификация

- **Длительность:** 60-75 секунд
- **Формат:** 1920×1080 16:9 (для лендинга и PH gallery)
- **Альтернативный формат:** 1080×1920 9:16 (для X / Instagram stories
  при наличии time/budget — приоритет 16:9)
- **Звук:** voiceover на английском (нативный английский голос),
  фоновая музыка subtle electronic/tech (license-free либо встроенный
  в AI generator)
- **Subtitles:** burnt-in английский (для muted autoplay на лендинге)
- **Brand colors:** indigo/violet accent (#7C5CFF), neutral dark base
  (#0A0A0B), white text. См. docs/UI_REVIEW_BRIEF.md секция 1.1
  для полной палитры если AI generator принимает кастомные цвета.

---

## Раскадровка (storyboard)

### Сцена 1 (0:00–0:08) — Hook problem

**Visual:** Browser tab grid с 6-8 открытыми вкладками (Cloudflare,
Brevo docs, Stack Overflow, Gmail Settings, Reddit r/sysadmin, AWS
docs). Cursor нервно перепрыгивает между ними. Timestamp в углу
крутится "00:00 → 00:45".

**Voiceover:**
> "Setting up email on your own domain takes ninety minutes.
> Cloudflare. DNS records. Brevo SMTP. Gmail Send-As. One typo
> and you start over."

**Subtitle:** "Setting up email on your domain — 90 minutes of pain"

### Сцена 2 (0:08–0:15) — Reveal product

**Visual:** Все вкладки исчезают на белый flash. На чёрном экране
появляется MailKit лого (envelope icon + "Mailkit" wordmark) в центре.
Под ним fade-in tagline.

**Voiceover:**
> "MailKit does it for you in five minutes. Five dollars. One time."

**Subtitle:** "MailKit. 5 minutes. $5. Once."

### Сцена 3 (0:15–0:30) — How it works (3 steps automation)

**Visual:** Горизонтальный progress flow. Слева Cloudflare logo →
анимированный checkmark "DNS configured" с приставкой "~15 sec". В
центре Brevo logo → checkmark "SMTP authenticated" с "~60 sec". Справа
Gmail logo → animated cursor показывает paste в SMTP form, checkmark
"Send-As configured" с "~3 min, guided".

**Voiceover:**
> "We configure Cloudflare Email Routing in fifteen seconds. We
> authenticate your domain in Brevo SMTP — sixty seconds. Then we
> walk you through Gmail's three-minute Send-As setup with copy-paste
> fields. That's the whole flow."

**Subtitle (smooth transitions):**
- "Step 1 — Cloudflare Email Routing (auto)"
- "Step 2 — Brevo SMTP authentication (auto)"
- "Step 3 — Gmail Send-As (3 minutes, guided)"

### Сцена 4 (0:30–0:45) — Outcome demonstration

**Visual:** Stylized Gmail Compose window opens. Cursor clicks From
dropdown. Список появляется: первая опция `john.doe@gmail.com` (серая,
"Default"), вторая `hello@yourdomain.com` (highlighted accent border,
slight glow), третья `hi@yourdomain.com`. Cursor выбирает
`hello@yourdomain.com`. Subject поле автоматически заполняется
"Hello from your domain". Cursor кликает Send. Анимация улетающего
конверта.

**Voiceover:**
> "After setup, your custom email lives inside Gmail like any other
> address. Compose. Reply. Forward. Your familiar inbox — your
> own domain."

**Subtitle:**
- "Your domain. Your Gmail. Same inbox."

### Сцена 5 (0:45–0:55) — Trust + guarantee

**Visual:** Чёрный экран. По центру три pill-badges fade-in
последовательно с 0.5 sec delay:
- Shield icon + "30-day money-back guarantee"
- Zap icon + "Auto-refund if our setup fails"
- Lock icon + "Your data, your control"

**Voiceover:**
> "Two-tier guarantee. If our automation fails, refund issued
> automatically within twenty-four hours. If you can't actually send
> mail in thirty days — full refund on request. We refund first,
> ask questions later."

**Subtitle:**
- "Refund-first guarantee"

### Сцена 6 (0:55–1:05) — CTA

**Visual:** MailKit логотип возвращается в центр. Под ним display-size
текст "$5" (плотный gradient indigo→violet — единственное использование
gradient в видео). Под ним кнопка-look-alike "Get your email →".
В правом нижнем углу pulsing dot с timer "~5 min total".

**Voiceover:**
> "Five dollars. Five minutes. Email on your domain. MailKit dot com."

**Subtitle:**
- "getmailkit.com — $5, once."

---

## Текст для AI video generator (полный voiceover, без сцен)

Этот блок копируешь целиком в text-to-speech поле AI generator'а. Если
generator поддерживает scene markers — используй разбивку выше.

```
Setting up email on your own domain takes ninety minutes. Cloudflare.
DNS records. Brevo SMTP. Gmail Send-As. One typo and you start over.

MailKit does it for you in five minutes. Five dollars. One time.

We configure Cloudflare Email Routing in fifteen seconds. We
authenticate your domain in Brevo SMTP — sixty seconds. Then we walk
you through Gmail's three-minute Send-As setup with copy-paste fields.
That's the whole flow.

After setup, your custom email lives inside Gmail like any other
address. Compose. Reply. Forward. Your familiar inbox — your own
domain.

Two-tier guarantee. If our automation fails, refund issued
automatically within twenty-four hours. If you can't actually send
mail in thirty days — full refund on request. We refund first, ask
questions later.

Five dollars. Five minutes. Email on your domain. MailKit dot com.
```

---

## Параметры AI generator (рекомендации)

### HeyGen / Synthesia (avatar-driven)

- Avatar: minimal corporate male/female (без overly casual либо overly
  formal стиля). Если есть AI avatar в стиле "tech founder" — то.
- Voice: американский акцент, среднего темпа, мягко-уверенный (не
  бодрый sales-голос)
- Background: neutral dark studio либо чистый чёрный (#0A0A0B)

### Runway / Pictory (visual-driven, без avatar)

- Использовать stock footage где возможно — кадры с laptop, browser
  tabs, Gmail interface
- Если есть AI image-to-video — генерировать кастомные сцены под
  storyboard выше
- Цветокоррекция: dark, slight cool-blue tint, accent moments в
  indigo/violet

### Descript

- Запись voiceover через Descript Overdub либо встроенный TTS
- Visuals — собирать в редакторе из stock + screenshots реального
  лендинга

### Если все варианты сложны — простой подход через Canva

- Canva имеет AI text-to-video через Magic Design
- Готовые шаблоны "SaaS product demo 60sec"
- Воиcеovers через ElevenLabs либо Murf
- Итоговая склейка в самом Canva

---

## Что можно упростить если AI generator не справляется со storyboard'ом

Минимально приемлемый вариант — концептуальный slide-show:

- Чёрный фон, белый текст
- Каждая сцена = 2-3 слайда с key sentence из voiceover (Большой
  display-size текст)
- Минимум movement — fade-in / fade-out transitions
- AI voiceover поверх

Это менее впечатляет визуально но лучше чем generic stock footage с
"happy team in office".

---

## Использование

После генерации:
- **Лендинг:** `<video>` тег в hero section либо отдельный блок над
  Pricing. Autoplay muted, controls visible. Архитектор готовит
  HTML/JSX wrapper по запросу разработчика когда видео будет готово.
- **Product Hunt:** Gallery video — первый файл в galleryassets, AI
  thumbnail из stable frame в районе 0:18 (когда показан лого + первый
  step).
- **X / Twitter:** Crop до 60 секунд (уберется хвост Final CTA), repost
  в треде launch day с pinned.
- **Indie Hackers:** Embed YouTube/Vimeo unlisted link в milestone post
- **Telegram канал:** Direct upload в канал с заголовком "Built MailKit
  in N weeks. 60-second walkthrough."

---

## RU локализация (не блокер для запуска)

Если AI generator поддерживает мультиязычный TTS — отдельный prompt с
переводом. Перевод voiceover на русский:

```
Настроить почту на своём домене занимает девяносто минут. Cloudflare.
DNS записи. Brevo SMTP. Gmail Send-As. Одна опечатка — начинай заново.

MailKit делает это за тебя за пять минут. За пять долларов. Один раз.

Настраиваем Cloudflare Email Routing за пятнадцать секунд.
Аутентифицируем твой домен в Brevo SMTP — шестьдесят секунд. Дальше
ведём тебя через трёхминутную настройку Gmail Send-As с готовыми
полями для копирования. Это весь процесс.

После настройки твой адрес на собственном домене работает в Gmail как
любой другой. Писать. Отвечать. Пересылать. Твой привычный инбокс —
твой собственный домен.

Двухуровневая гарантия. Если наша автоматика сломалась — возврат
автоматически в течение двадцати четырёх часов. Если не можешь
отправлять почту в течение тридцати дней — полный возврат по запросу.
Сначала возвращаем деньги, потом задаём вопросы.

Пять долларов. Пять минут. Почта на твоём домене. mailkit точка com.
```

---

## Стоимость и время на produktion

| Подход | Стоимость | Время owner'а |
|---|---|---|
| HeyGen avatar | $30-100/mo subscription | 1-2 часа на iteration |
| Synthesia avatar | $30-90/mo | 1-2 часа |
| Runway image-to-video | $15-50/mo | 2-4 часа |
| Pictory text-to-video | $20-60/mo | 1-2 часа |
| Descript полная склейка | $24/mo | 3-5 часов |
| Canva Magic Design | $13/mo (Pro) | 2-3 часа |
| Полный кастом через freelancer | $200-800 разово | 30 мин брифа + ревью |

Для MVP soft launch — Pictory или HeyGen достаточны. Кастомный
freelancer-вариант — post-launch upgrade при наличии revenue.
