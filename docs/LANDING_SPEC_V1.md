# MailKit — Landing Spec v1

First-pass proposal лендинга для launch'а (тикет #11 Landing copy polish).
Architect'ский draft без consensus'а с owner — owner ревьюит, говорит что
правит. После approval каждой секции — передаем в dev с content-блоками
для имплементации.

Источники правды (все ссылки из этого файла):
- [docs/PRODUCT_BRIEF.md](PRODUCT_BRIEF.md) — product scope, user flow, pricing
- [docs/MARKETING_ANGLES.md](MARKETING_ANGLES.md) — audience segments, objection handling, taglines
- [docs/GUARANTEE_POLICY.md](GUARANTEE_POLICY.md) — guarantee wording, trust block copy
- [docs/SECURITY.md](SECURITY.md) — security section talking points
- [docs/GO_TO_MARKET.md](GO_TO_MARKET.md) — launch strategy context

---

## 1. Strategic principles (почему именно так)

### 1.1 Dual audience problem, single page solution

Наша аудитория — pentacle из 5 сегментов (indie hackers, SMB owners,
freelancers, small agencies, non-English entrepreneurs). Один лендинг
обслуживает всех через **progressive disclosure**:

- **Headline** — простой benefit, понятный всем ("Email on your domain
  in 5 minutes")
- **Subhead** — технические детали для тех кто знает SPF/DKIM/SMTP
  ("We handle Cloudflare Email Routing + Brevo SMTP + guided Gmail
  Send-As")
- **Pricing+FAQ** — два уровня убеждения: "Just $5, no monthly fees"
  (SMB) и "Save 90 minutes of DNS hell" (indie hackers)

### 1.2 Honest positioning — iron rule

Tagline "Email on your domain in 5 minutes, guaranteed" — OK только
потому что backed two-tier policy в GUARANTEE_POLICY. Никаких "0 clicks",
"full auto", "magic". Каждое "5 minutes" в copy — астериск с легко-находимой
ссылкой на точную policy.

### 1.3 Checkout placement strategy

Lemon Squeezy checkout — **три точки** на странице для максимизации
conversion, но с одним URL и одной pricing:

1. **Hero primary CTA** — большая кнопка сразу, для решивших impulsive
2. **Pricing section CTA** — для читающих-детально, после FAQ+trust block
3. **Final CTA block** — после FAQ, последний shot для scrollers

Одна цена, один flow, три entry point'а. Не три разных продукта.

### 1.4 Russian market — не калька EN

RU версия не "переведенный EN", а native-copy. Тон там другой: меньше
indie-hacker bravado, больше "мы держим тебя за руку, всё будет хорошо".
В EN допустимы такие фразы как "skip 90 minutes of DNS hell" — в RU
лучше "избавься от часовой возни с DNS". Не дословно, но с тем же
emotional payload для target audience.

---

## 2. Page structure — 8 секций от top до footer

Order от hero до footer. Justification каждой секции ниже.

1. **Header** — nav, logo, language switcher, "Sign in" текстовый link
2. **Hero** — headline + subhead + primary CTA + illustrative visual
3. **Problem section** — "DNS hell" visualization (before/after)
4. **How it works** — 3-step pipeline (CF → Brevo → Gmail) с визуалом
5. **Pricing** — card с $5 + что включено + secondary CTA button
6. **Trust & guarantee** — two-tier guarantee + security badges +
   "We handle tech, you do 3 clicks"
7. **FAQ** — 8 вопросов (objection handling из MARKETING_ANGLES.md)
8. **Final CTA** — последняя конверсионная попытка перед footer
9. **Footer** — legal, support email, social, guarantee link

---

## 3. Section-by-section content draft

### 3.1 Header

**Structure:**
- Left: MailKit logo (text wordmark + accent dot или мини-email icon)
- Center: nav links (Pricing, How it works, FAQ) — anchor links на
  соответствующие sections
- Right: Language switcher (EN/RU toggle) + "Sign in" text link
  (→ OAuth flow → `/app` для existing customers)

**Notes:**
- Sticky header при scroll (опционально, проверить impact на Perf gate)
- Mobile: hamburger menu, language toggle остается visible в top bar
- Никакой "Sign up" кнопки в header'е — primary action = purchase, не signup
- Existing user кликает "Sign in" → если paid → `/app/setup` или `/app`
  dashboard; если не paid → `/pricing` redirect с explanation

### 3.2 Hero

**Purpose:** первое впечатление, primary CTA для impulse buyers.

**Layout:** left-column headline + subhead + CTA, right-column visual.
На mobile — stacked, CTA выше visual'а.

**Copy — EN (primary):**

> # Email on your domain in 5 minutes.
> ## *Guaranteed. ([see policy](/guarantee))*
>
> Skip 90 minutes of DNS hell, Brevo configuration gotchas,
> and Gmail Send-As setup. We automate the technical parts — you do
> three copy-paste clicks in Gmail. That's it.
>
> [**Get your email — $5**] [How it works →]

**Copy — RU (primary):**

> # Почта на домене за 5 минут.
> ## *С гарантией. ([условия](/guarantee))*
>
> Забудь про час возни с DNS, про грабли Brevo и танцы с настройкой
> Gmail Send-As. Мы автоматизируем техническую часть — ты делаешь три
> copy-paste действия в Gmail. И всё.
>
> [**Настроить почту — $5**] [Как это работает →]

**Visual (right column):**

- Простая анимация / статичная SVG: "hello@yourdomain.com" появляется
  в Gmail Compose "From:" dropdown. Показывает конечный результат —
  юзер отправляет письмо с custom domain из своего Gmail.
- Альтернатива: 3-step progress bar "Cloudflare ✓ → Brevo ✓ → Gmail"
- Избегать: abstract иллюстрации "соединения" / "магия" — они не объясняют
  что получит юзер

**Primary CTA:**
- Copy: "Get your email — $5" / "Настроить почту — $5"
- Link: Lemon Squeezy product URL (hardcoded с variant ID)
- Style: large primary button, accent color (brand primary), min-height
  52px, 18px bold text, rounded-xl
- Hover: subtle scale (1.02) + shadow boost

**Secondary link:**
- Copy: "How it works →" / "Как это работает →"
- Smooth-scroll к section 3.4

### 3.3 Problem section — "DNS hell"

**Purpose:** подтвердить pain, дать permission юзеру что "да, это
реально сложно, ты не один".

**Layout:** two-column comparison. Left = "Without MailKit (the DIY
nightmare)", Right = "With MailKit (5 minutes)".

**Copy — EN:**

> ## Email on your own domain — it should be simple. It isn't.
>
> **Without MailKit:**
> - Research Cloudflare Email Routing vs ImprovMX vs others (30 min)
> - Read Brevo SMTP docs, get confused by "API key vs SMTP key" (15 min)
> - Write DNS records by hand: MX, SPF, DKIM, DMARC, brevo-code (15 min)
> - Test, discover a typo in SPF, rewrite (10 min)
> - Configure Gmail Send-As, wonder why SMTP auth fails (10 min)
> - Finally, maybe, it works. Maybe. Maybe not.
>
> **Total: 60–90 minutes for someone who knows what they're doing.
> 3+ hours for everyone else.**
>
> **With MailKit:**
> - Paste a Cloudflare API token
> - Pick your domain
> - Copy-paste 4 values into Gmail (we guide you)
> - Done. `hello@yourdomain.com` works in your Gmail.
>
> **Total: 5 minutes. Money back if it fails on our end.**

**Copy — RU:**

> ## Почта на своём домене — должно быть просто. Не получается.
>
> **Без MailKit:**
> - Гуглишь Cloudflare Email Routing vs ImprovMX vs другие (30 мин)
> - Читаешь доки Brevo SMTP, путаешься "API key vs SMTP key" (15 мин)
> - Руками пишешь DNS записи: MX, SPF, DKIM, DMARC, brevo-code (15 мин)
> - Тестируешь, находишь опечатку в SPF, переписываешь (10 мин)
> - Настраиваешь Gmail Send-As, понимаешь что SMTP auth падает (10 мин)
> - Наконец, может быть, работает. Может быть. Может нет.
>
> **Итого: 60–90 минут для тех кто в теме.
> 3+ часа для всех остальных.**
>
> **С MailKit:**
> - Вставляешь Cloudflare API токен
> - Выбираешь свой домен
> - Копи-пастишь 4 значения в Gmail (мы ведём пошагово)
> - Готово. `hello@yourdomain.com` работает в твоём Gmail.
>
> **Итого: 5 минут. Деньги назад если сломалось на нашей стороне.**

**Design notes:**
- Left column — red/warning accent colors, longer list visually
  emphasizing pain
- Right column — green/accent color, short clean list
- Time totals — highlighted в pill-badges для contrast

### 3.4 How it works — 3-step

**Purpose:** снять страх "что именно произойдет". Explain process,
build trust through transparency.

**Layout:** 3 cards горизонтально, на mobile — stacked.

**Copy — EN:**

> ## How MailKit works — 3 automated steps + 1 guided
>
> ### 1. Cloudflare Email Routing (automated)
> We enable Email Routing on your domain, write MX records, and
> set up forwarding from `hello@yourdomain.com` to your Gmail inbox.
> **~15 seconds. We use your Cloudflare API token (you keep control).**
>
> ### 2. Brevo SMTP setup (automated)
> We claim your domain in Brevo, write DKIM + SPF + DMARC records,
> and verify authentication.
> **~60 seconds. Brevo handles outbound mail under the hood; you don't
> manage a Brevo account.**
>
> ### 3. Gmail Send-As (guided, 3 clicks)
> We show you exactly what to paste into Gmail — SMTP server,
> credentials, your new email address. You confirm in Gmail.
> **~3 minutes. The wizard walks you through each click.**
>
> After these three steps, `hello@yourdomain.com` works in your Gmail
> like any other address — compose, reply, forward. No new inbox to
> check. No Workspace subscription.

**Copy — RU:** (аналогичная структура, native tone, не дословно)

> ## Как работает MailKit — 3 автоматических шага + 1 пошаговый
>
> ### 1. Cloudflare Email Routing (автоматика)
> Включаем Email Routing на твоем домене, прописываем MX записи,
> настраиваем пересылку `hello@твой-домен.com` в твой Gmail.
> **~15 секунд. Используем твой Cloudflare API токен (контроль остаётся у тебя).**
>
> ### 2. Brevo SMTP (автоматика)
> Подключаем твой домен к Brevo, прописываем DKIM + SPF + DMARC записи,
> верифицируем аутентификацию.
> **~60 секунд. Brevo отправляет письма под капотом; тебе не надо заводить Brevo аккаунт.**
>
> ### 3. Gmail Send-As (пошагово, 3 клика)
> Показываем что именно вставить в Gmail — SMTP сервер, реквизиты,
> твой новый email. Ты подтверждаешь в Gmail.
> **~3 минуты. Мастер ведёт через каждый клик.**
>
> После этих трёх шагов `hello@твой-домен.com` работает в твоём Gmail
> как любой обычный адрес — писать, отвечать, пересылать. Не надо
> проверять отдельный инбокс. Не надо платить за Workspace.

**Visual:**
- 3 simple iconography: Cloudflare logo → Brevo logo → Gmail logo
- Connecting arrows с duration labels ("15s" / "60s" / "3min")
- Color-coded: automated steps — accent color (blue/our brand),
  guided step — slightly warmer accent (orange?) чтобы выделить "ты тут"

### 3.5 Pricing section

**Purpose:** ясно и коротко обозначить цену, что включено, снять
возражения про "а потом будут подписки?"

**Layout:** single prominent card center-aligned, большой $5, список
inclusions, secondary CTA button.

**Copy — EN:**

> ## Simple pricing
>
> ### **$5 one-time per mailbox**
>
> **What's included:**
> - ✓ Cloudflare Email Routing setup (MX, forwarding)
> - ✓ Brevo SMTP authentication (DKIM, SPF, DMARC)
> - ✓ Guided Gmail Send-As configuration
> - ✓ Unlimited free aliases on your domain (via Cloudflare)
> - ✓ 30-day money-back guarantee
> - ✓ Automation-failure auto-refund
>
> **No recurring charges. No hidden fees. No Workspace subscription
> required.**
>
> Need 3 mailboxes on the same domain? [3-mailbox bundle — $12](/pricing#bundle)
> (coming post-launch)
>
> Want continuous deliverability monitoring? [Add monitoring — $3/mo](/pricing#monitoring)
> (optional, post-setup upgrade)
>
> [**Start setup — $5**]

**Copy — RU:**

> ## Простое ценообразование
>
> ### **$5 разовый платёж за ящик**
>
> **Что входит:**
> - ✓ Настройка Cloudflare Email Routing (MX, пересылка)
> - ✓ Аутентификация Brevo SMTP (DKIM, SPF, DMARC)
> - ✓ Пошаговая настройка Gmail Send-As
> - ✓ Бесконечные бесплатные алиасы на твоём домене (через Cloudflare)
> - ✓ 30-дневная гарантия возврата денег
> - ✓ Автоматический возврат при сбое автоматики
>
> **Без подписок. Без скрытых платежей. Без Google Workspace.**
>
> Нужно 3 ящика на одном домене? [3-mailbox bundle — $12](/pricing#bundle)
> (появится после launch'а)
>
> Хочешь мониторинг доставляемости? [Мониторинг — $3/мес](/pricing#monitoring)
> (опционально, после настройки)
>
> [**Настроить — $5**]

**Design notes:**
- Card с border + light shadow, центральный elevated эффект
- $5 size ~ 64px display typography, bold, accent color
- Inclusions — green checkmarks с clear spacing
- "No recurring" callout — отдельная pill badge под ценой
- Secondary CTA (button) — same styling как hero primary, идентичный
  Lemon Squeezy URL target
- Bundle и Monitoring mentions — текстовые links, не buttons (не должны
  соревноваться с primary CTA)

### 3.6 Trust & guarantee block

**Purpose:** снять финальные блокеры перед покупкой. Сюда же идет
security reassurance для SMB аудитории.

**Copy — EN:**

> ## We stake our money on it working
>
> **Two guarantees, zero ambiguity:**
>
> - **If our automation fails** (our Cloudflare or Brevo setup breaks
>   on our end) — full refund issued automatically within 24 hours.
>   We see the failure, we return your money. You do nothing.
>
> - **30-day money-back** — if you can't actually send email through
>   your domain after setup, even with our support help — full refund.
>   Just email us.
>
> - **Your time on the Gmail step** isn't timed. We guide you click
>   by click; you go at your own pace.
>
> [Full guarantee policy →](/guarantee)
>
> ---
>
> **Your data, your control:**
>
> - Your Cloudflare API token lives in your browser during setup and
>   isn't stored on our servers after the pipeline finishes.
> - Your Gmail SMTP credentials are generated by Brevo; you paste them
>   into Gmail — we never see your password.
> - We don't read, send, or store your emails. Your Gmail stays yours.
> - Full security notes: [see docs/SECURITY.md](/security)

**Copy — RU:** (аналогичная структура, native phrasing)

> ## Деньги назад, если не работает
>
> **Две гарантии, без мелкого шрифта:**
>
> - **Если наша автоматика сломалась** (Cloudflare или Brevo упали на
>   нашей стороне) — возврат денег автоматически в течение 24 часов.
>   Мы видим сбой, возвращаем деньги. От тебя ничего не требуется.
>
> - **30-дневный возврат** — если после настройки реально не можешь
>   отправлять письма со своего домена, даже с помощью нашего support —
>   полный возврат. Просто напиши нам.
>
> - **Твоё время на Gmail-шаге** не засекается. Мы ведём клик за кликом,
>   ты идёшь в своём темпе.
>
> [Полные условия →](/guarantee)
>
> ---
>
> **Твои данные — твои:**
>
> - Cloudflare API токен живёт в твоём браузере во время настройки
>   и не хранится на нашем сервере после.
> - SMTP credentials для Gmail генерирует Brevo; ты вставляешь их в Gmail
>   — мы никогда не видим твой пароль.
> - Мы не читаем, не отправляем и не храним твою почту. Твой Gmail
>   остаётся твоим.
> - Полные security заметки: [docs/SECURITY.md](/security)

### 3.7 FAQ

**Purpose:** закрыть 8 ключевых возражений. Базируется на
`docs/MARKETING_ANGLES.md` objection handling table.

**Format:** accordion (collapsed by default, клик расширяет).

**Questions (EN, 8 штук):**

1. **"Can't I do this myself for free?"** — "Yes — in 60–90 minutes if
   you know what you're doing. MailKit is $5 for 60+ minutes of your
   time. You decide if that's a fair trade."

2. **"What if I already tried with ChatGPT?"** — "ChatGPT explains theory.
   But the clicks are still yours. Plus: LLM knowledge of Brevo's UI
   is stale (they ship changes every 3 months), so it often gives
   outdated steps. MailKit reads APIs directly and does the clicks
   for you."

3. **"Why not Google Workspace / Zoho?"** — "Workspace replaces Gmail —
   $6/user/month, new login, new inbox. MailKit complements Gmail —
   your familiar inbox, plus your domain. $5 one-time. Different
   category."

4. **"The Gmail step isn't fully automated, is it?"** — "Correct. Gmail's
   API doesn't allow us to add Send As addresses on personal Gmail
   accounts — that's a Google restriction, not our choice. So we built
   the best possible guided experience: 3 copy-paste actions, ~3
   minutes. Full transparency: our 'automated' part is ~90 seconds,
   your 'copy-paste' part is ~3 minutes. That's why the tagline is
   '5 minutes' total."

5. **"What if it breaks after setup?"** — "30-day functional guarantee
   covers it — we fix it or refund. Want ongoing monitoring?
   [$3/month adds daily checks + alerts](/pricing#monitoring). Optional."

6. **"Is my data safe?"** — "Your Cloudflare token is used and discarded
   during setup; not stored. Your Gmail SMTP password is generated
   by Brevo and pasted by you directly into Gmail; we never see it.
   Full details in [our security notes](/security)."

7. **"Do you support domains from any registrar?"** — "As long as your
   domain is on Cloudflare DNS, yes. Cloudflare DNS is free — if you're
   not there yet, migrating takes 5-10 minutes. We add setup guide for
   that case in the wizard."

8. **"What happens if I want to cancel or remove the setup later?"** —
   "You own everything we configure. Cancel anytime — we don't lock you
   in. To remove: disable Send-As in Gmail, delete DNS records we added,
   disable Cloudflare Email Routing. Takes 3 minutes. We can provide
   step-by-step removal instructions on request."

**Questions (RU):** аналогичные 8 вопросов с native phrasing, не
дословный перевод. Полный draft — отдельно, после approval structure.

### 3.8 Final CTA block

**Purpose:** последняя попытка для scrollers'ов которые дошли до FAQ
без purchase.

**Copy — EN:**

> ## Ready to stop fighting with DNS?
>
> **`hello@yourdomain.com` in 5 minutes. $5. Money back if it breaks.**
>
> [**Get your email — $5**]
>
> Questions before you buy? [support@getmailkit.com](mailto:support@getmailkit.com)

**Copy — RU:**

> ## Готов покончить с возней с DNS?
>
> **`hello@твой-домен.com` за 5 минут. $5. Деньги назад если сломалось.**
>
> [**Настроить почту — $5**]
>
> Есть вопросы? [support@getmailkit.com](mailto:support@getmailkit.com)

**Design:** full-width accent-color band, centered content, large CTA.

### 3.9 Footer

**Structure:**
- Left column: MailKit logo + short tagline ("Email on your domain,
  in 5 minutes") + copyright year
- Middle column: product links (Pricing, How it works, FAQ, Sign in)
- Right column: legal/support (Guarantee, Security, Terms of Service,
  Privacy, support@getmailkit.com, Twitter/X link если есть)

Language switcher duplicated в footer (ease of access на long pages).

---

## 4. Lemon Squeezy integration points

### 4.1 Checkout URL

Один product в Lemon Squeezy: "MailKit Email Setup — $5". После создания
получаем checkout URL (форматом `https://mailkit.lemonsqueezy.com/buy/<uuid>`).
Этот URL — hardcoded в 3 CTA buttons (hero, pricing, final).

На клике — redirect в Lemon Squeezy hosted checkout (LS принимает оплату,
tax handles как Merchant of Record для RU/KZ/EU tax).

### 4.2 Post-payment redirect

Lemon Squeezy product settings → Thank You URL:
`https://getmailkit.com/app/setup?paid=1&order_id={order_id}`

Пользователь попадает на:
1. Authed: если user уже signed in через Google OAuth — сразу в wizard
2. Unauthed: `/auth` → OAuth → redirect back to `/app/setup?paid=1`

`paid=1` flag — client-side hint что юзер только что оплатил,
показываем welcome toast "Your setup is unlocked! Let's get your email
running." Реальный check paid-status — через DB `purchases` table
lookup по user.email + `order_id`.

### 4.3 Webhook handler

`POST /api/webhooks/lemon-squeezy` (implementation в Ticket #7 etap 1):
- Verify HMAC signature (LS sends `X-Signature` header)
- Handle events: `order_created` → `purchases` insert, `order_refunded`
  → `refunds` log update + disable user's active setup_run

### 4.4 Auto-refund trigger

`setup_runs.status → failed` с `failed_step ∈ {cf_*, brevo_*}` →
internal cron / event handler → Lemon Squeezy `POST /refunds` API →
`refunds` table log + email юзеру. Per
[GUARANTEE_POLICY.md](GUARANTEE_POLICY.md) "Automation Failure Refund".

---

## 5. Visuals & assets needed

1. **Hero visual** — Gmail Compose с "From: hello@yourdomain.com"
   dropdown. Design option A (рекомендую): real screenshot styled как
   abstract illustration. Option B: SVG схема с 3-step flow.
2. **How-it-works icons** — Cloudflare / Brevo / Gmail логотипы (fair
   use для product integration context, проверить trademark policies
   каждого — обычно OK для "we integrate with X" контекста).
3. **Problem section icon pair** — clock-red (for "without") и
   clock-green (for "with"), или аналогичная метафора.
4. **FAQ icons** — отсутствуют (acceptable без них)
5. **Trust block** — guarantee shield icon, lock icon для security
6. **Footer** — social icons (X/Twitter, RSS — whatever мы будем
   поддерживать в первой фазе)

Все SVG inline в Next.js component'ах. WebP раstr'ы для фото (если
будут testimonials с аватарами — post-launch).

---

## 6. Implementation notes для dev (когда начнем)

### 6.1 Page structure

`app/[locale]/page.tsx` (existing landing) — переписываем content в
components/landing/ — каждая section отдельный component:

- `HeroSection.tsx`
- `ProblemSection.tsx`
- `HowItWorksSection.tsx`
- `PricingSection.tsx`
- `TrustSection.tsx`
- `FaqSection.tsx`
- `FinalCtaSection.tsx`

Это упрощает:
- A/B testing (swap hero variant — один component replace)
- Independent SSG caching
- Code splitting через `dynamic()` для FAQ и Final CTA (ниже fold)

### 6.2 Copy в next-intl

Все строки копи — в `messages/{en,ru}.json` под namespace `landing.*`:

```
landing.hero.headline
landing.hero.subhead
landing.hero.primaryCta
landing.hero.secondaryLink
landing.problem.headlineWithout
...
```

Нет hardcoded strings в JSX.

### 6.3 Perf considerations

Current landing baseline (post-#6, prod): EN 75 / RU 85 (landing). Цель
после redesign: не регрессировать. Риски:
- Добавляем много контента → bundle grows → TBT risk
- Animation в hero visual → can hurt LCP
- Multiple images → LCP candidate change, preload strategy

Mitigations:
- Static SVG inline (zero runtime cost)
- All content SSR (no client JS for static sections)
- FAQ accordion — vanilla details/summary (zero JS) vs React state
- Lemon Squeezy CTA button — plain <a href> target="_blank" без JS

### 6.4 Lighthouse pre-merge gate

Новый landing должен проходить тот же gate что текущий: Perf ≥70
(prod warmed, 60-мин post-deploy, n=5 median). Если ниже — investigate
до merge.

---

## 7. Open decisions для owner (мои recommendations в скобках)

1. **Hero visual стиль** — option A: real Gmail screenshot как abstract
   illustration (рекомендую, более convincing для non-tech audience).
   Option B: SVG 3-step progress flow (рекомендую secondary для mobile
   если A не влезает).
2. **Social proof в v1 landing** — нет testimonials на launch day
   (we're pre-launch). Добавляем "Join the first 100 customers — free"
   announcement bar? (рекомендую ДА, reinforce'ит launch momentum из
   PRODUCT_BRIEF "First 100 setups — бесплатно").
3. **Problem section — left/right split или stacked?** — split (рекомендую)
   на desktop, stacked на mobile. Visual compare > stacked lists.
4. **Pricing section — одна цена или показывать 3-mailbox bundle ghost'ом?**
   — одна цена visible (рекомендую), bundle как text-link под ней.
   Упрощает decision.
5. **FAQ — accordion или stacked?** — accordion (рекомендую). Уменьшает
   visual overwhelm, увеличивает scroll через page.
6. **CTA copy — "Get your email" vs "Start setup"?** — "Get your email
   — $5" (рекомендую EN) / "Настроить почту — $5" (RU). "Get your
   email" more benefit-focused, "Start setup" more process-focused.
7. **Announcement bar / sticky CTA при scroll?** — НЕТ (рекомендую),
   simple scroll без persistent distractions. Можем A/B test later.

---

## 8. Next steps

1. **Owner review этого spec'а** — проход по sections 3.1-3.9, обратная
   связь по copy + structure. Не нужно одобрять всё сразу — reference
   section numbers + конкретные правки.
2. **После approval основных sections** — architect переписывает
   owner-corrected copy в final версию в том же файле (v2).
3. **Dev kickoff Ticket #11** — после финализации spec. Оценка: 2-3
   дня (content heavy, mostly static components + i18n keys).
4. **Coordination с Ticket #7** (Lemon Squeezy) — pricing section +
   all CTAs зависят от наличия working LS checkout URL. Logical
   sequencing: #7 этап 1 (LS integration + test URL) → #11 (landing с
   actual LS CTA links).

---

**Status:** v1 draft, pending owner review. Architect: ready to
iterate on any section based on owner feedback.

---

## 9. v1.1 Design references (architect directive, 2026-04-24)

Owner skipped doc-level review of visual styling — they'll critique the
live preview instead. This section is a **permanent record of the
design decisions** that inform implementation, so the dev, future devs,
and architect can all cross-reference what was accepted without going
back to chat.

### 9.1 Visual language base

- **Linear minimalism.** Generous whitespace — `min 96px` vertical
  padding on section boundaries. Huge display typography for headings
  (`60-80px` on desktop hero). Subtle ambient gradients (NOT full
  animated). Indigo/violet accent color as primary.
- **Dark mode primary**, light mode available — shadcn theme toggle in
  header.
- **Typography:** Geist Sans (already in stack), weights 400 / 500 /
  700, tight tracking on display sizes.
- **Whitespace over decoration.** No cramming content — breathing room
  even at the cost of more scroll length.

### 9.2 Per-section patterns (concrete references)

- **Header** — Vercel pattern: logo + minimal nav (Pricing, FAQ) +
  language switcher + "Sign in" text link. Sticky with
  `backdrop-blur` on scroll (Linear-style).
- **Hero** — Linear pattern. Left column (60%): display headline
  (Geist Sans 72px bold), subhead (Geist Sans 20px regular), CTA pair
  (primary filled + secondary ghost arrow-right). Right column (40%):
  product visual. For v1 — SVG schematic 3-step flow (CF → Brevo →
  Gmail) on a subtle gradient background. Post-launch iteration — real
  MailKit wizard screenshot on a 3D angle (Linear-style). **Do NOT
  ship a real screenshot in v1** — too much polish before real
  customers. Mobile: stacked, visual below text. Background: very
  subtle indigo-to-purple gradient at ~5% opacity, non-distracting.
- **"Integrates with" logo bar** (Stripe pattern) — directly under
  the hero: Cloudflare + Brevo + Gmail logos on a clean grey
  background, "Integrates with:" lead text. Trust signal + tech
  transparency.
- **Announcement banner** "First 100 customers — free setup"
  (launch-week tactic from GO_TO_MARKET) — full-width top banner above
  the header, dismissable via an X, indigo accent background. Remove
  through week-2 post-launch.
- **Problem section** — Linear/Notion split. Two-column comparison
  "Without MailKit" (red accent) vs "With MailKit" (indigo accent).
  Icons: Clock-red / Clock-indigo in corners. On mobile — stacked.
- **How it works** — Stripe 3-card pattern. Three numbered cards
  horizontal (1 / 2 / 3). Icon on top of each card (CF / Brevo / Gmail
  official logos, fair-use). Time badge below icon (`15s` / `60s` /
  `3min`). Heading + 2-3 line description. Connecting arrow lines
  between cards on desktop, hidden on mobile (stacked).
- **Pricing** — Linear simplicity. Single card, centered,
  `max-width 480px`. Huge `$5` (80px display typography) + "one-time
  per mailbox" subtle subscript. Checklist inclusions (green
  checkmarks from `lucide-react` — `CheckCircle2`). Secondary CTA
  matching hero primary style. Bundle mention as a ghost text-only
  link.
- **Trust / guarantee block** — Stripe trust-layer. Two columns: left
  guarantee summary (Shield icon + 3-bullet list), right security
  summary (Lock icon + 3-bullet list). Links to `/guarantee` and
  `/security` (internal pages if built, otherwise anchors).
- **FAQ** — Notion accordion. Native `<details><summary>` HTML (zero
  JS, perf-friendly). Chevron icon rotation on open (CSS only). Eight
  questions per `LANDING_SPEC_V1.md` section 3.7. Sidebar contact
  hint: "Still have questions? support@getmailkit.com".
- **Final CTA band** — Linear full-width accent: indigo-to-purple
  gradient background, centered content, huge CTA button, contact
  email mention subtle.
- **Footer** — Linear minimal. Three columns max (Product / Legal /
  Contact). Language switcher duplicated. Copyright line. Social
  links (X if we have one).

### 9.3 Color palette (Tailwind)

| Role | Dark (primary) | Light (optional) |
|---|---|---|
| Foundation bg | `neutral-950` | `neutral-50` |
| Primary accent | `indigo-500 → violet-600` gradient for CTA backgrounds | same |
| Text primary | `neutral-100` | `neutral-900` |
| Text secondary | `neutral-400` | `neutral-600` |
| Success (checkmarks) | `emerald-500` | same |
| Warning / problem section | `red-400` | `red-600` |
| Borders / dividers | `neutral-800` | `neutral-200` |

### 9.4 Animations

Subtle. Fade-in-on-scroll for sections via `IntersectionObserver` +
CSS transitions. **No hero particle animations, mouse-follow effects,
or scroll-linked parallax.** Perf-first.

### 9.5 Tooling

- `shadcn/ui` components where applicable: `Button`, `Card`, and the
  new adds below.
- Pre-flight adds for Ticket #11 etap 1: `shadcn add dropdown-menu`
  (language switcher) + `shadcn add accordion` (FAQ — still overridden
  by native `<details>` per 9.2, component available for any future
  non-perf-critical accordion need). Plus `pnpm add next-themes` for
  the dark/light toggle — handles SSR FOUC, system-preference
  detection, standard ecosystem pick. +4KB gzipped, accepted.
- `Dialog` **not** added in v1 — overkill for the lang switcher and
  theme toggle. Reserved for future confirmation modals in the
  onboarding wizard.
- `lucide-react` already in stack for icons.
- Tailwind arbitrary values for design tokens where shadcn defaults
  don't reach.
- Geist Sans as-is from the existing stack.

### 9.6 Out of scope for v1

- Target-audience tabbed hero (Notion feature) — v2 post-launch after
  baseline landing is shipped.
- Testimonials with avatars — no customers yet on launch day.
- Animated product demo video — post-launch if conversion needs a
  boost.
- Custom illustrations — SVG schematic from designer, also post-launch.
- Dark-mode auto-detect — manual toggle is enough for v1 (next-themes
  still honors `prefers-color-scheme` via `system` mode; surface the
  toggle so users have override).

### 9.7 Implementation sequencing (4 etaps)

Commit-per-section, push preview after each etap. Boris reviews on the
preview URL iteratively.

1. **Etap 1** — Announcement banner + Header + Hero + Integrations bar
   (4 components, ~3-4h).
2. **Etap 2** — Problem + How-it-works + Pricing (3 components, ~4h).
3. **Etap 3** — Trust + FAQ + Final CTA + Footer (4 components, ~3h).
4. **Etap 4** — Responsive QA, dark/light theme QA, Lighthouse gate,
   i18n parity (EN/RU) via Playwright + LH methodology.

### 9.8 Open decisions (accepted, all seven per architect recommendations)

From section 7 above, all seven open decisions accepted without owner
round-trip:

1. Hero visual: **Option A** (SVG 3-step schematic for v1; real
   screenshot in v2 post-launch).
2. Announcement bar "First 100 — free": **YES**, above header,
   dismissable.
3. Problem section split: **desktop split, mobile stacked**.
4. Pricing: **single visible price**, bundle as text-link under it.
5. FAQ: **accordion** (native `<details>`).
6. CTA copy: **"Get your email — $5"** (EN) / **"Настроить почту — $5"** (RU).
7. Sticky scroll CTA: **NO** — simple scroll, no persistent distraction.
