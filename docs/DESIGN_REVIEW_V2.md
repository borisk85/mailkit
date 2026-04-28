# MailKit — Design Review V2

Built on top of `docs/UI_REVIEW_BRIEF.md` (premium-pass V1, merged). V2 is
the second pass that takes the merged base from "functional premium" to
"PH-ready premium" — removing residual rough edges, fixing real bugs found
in prod screenshots, tightening copy on both locales, and adding the few
visual elements that V1 either missed or implemented partially.

Implementation goes in **one** branch: `feat/design-v2`.

V2 is NOT a rewrite of V1. Tokens, palette, typography scale, motion rules
from V1 stand. V2 only patches what's broken or undercooked.

Sources for this review: 10 prod screenshots
(`docs/ui-review/prod-current/prod-{1920|1280|768|414|390}-{en|ru}.png`),
header close-up (`docs/ui-review/header/`), favicon set
(`docs/ui-review/favicon/`), code audit of
`components/{landing,app,ui}`, `messages/{en,ru}.json`,
`app/[locale]/layout.tsx`, `components/cookie-consent.tsx`.

---

## 0. TL;DR — what V2 fixes

Hard bugs (must-fix):

1. **Cookie consent banner overlaps the primary hero CTA on mobile**
   (390/414) and overlaps the Gmail mockup at 768/1280/1920. The banner is
   a fixed bottom-right card 520px wide that lands on top of the hero's
   right column or its CTA, blocking interaction on first paint.
2. **Wordmark casing inconsistency** — `messages/{en,ru}.json` carry
   `"logo": "MailKit"` (camel-case) while V1 §7.5 revision specifies
   `"Mailkit"` (capital M, lowercase rest). Header close-up confirms
   `MailKit` rendered in prod, contradicting the spec.
3. **Trailing accent dot still visible** in the header lockup on the
   1920 EN/RU header close-up screenshot. V1 §7.5 explicitly removed it.
   Code path is clean, so the dot must be coming from a stale build or a
   dependent component (likely `app-header` or a shared `BrandLockup`).
   Verify and excise.
4. **Brand icon is still PNG raster** (`/public/brand/mailkit-icon.png`)
   referenced through `next/image`. V1 said convert to SVG. Not done.
   Result is visible blur in the header at retina rendering.
5. **Favicon-16 is a downscale** of the full envelope, reading as a
   fuzzy blue square in tab strips. V1 said create a separate pixel-art
   16×16 source. Not done.
6. **`landing.announcementBanner.cta` RU = "Как →"** — orphaned word, no
   meaning in Russian standalone. Reads as a translation bug.
7. **"Three automated steps. One you do yourself."** headline above a
   row of four numbered cards (01–04) creates a cognitive double-take on
   first read. The headline is technically accurate (3 automated + 1
   manual = the four shown), but the eye reads "three" then counts four
   numbers and stalls. Resolve via headline rewrite + visual grouping.

Soft bugs (high-leverage polish):

8. Hero right-column Gmail mockup blends into the page background
   because both use neighboring elevated surfaces with low contrast.
   Mockup needs a stronger surface, a defined shadow, and the 3D tilt
   that V1 prescribed but is implemented at 0deg.
9. RU copy in `landing.problem.without.steps` and `.with.steps` uses
   dev-jargon (`Гуглишь`, `Дебажишь`, `Логинишься`) that alienates the
   SMB / freelancer / non-tech-founder segments listed in `CLAUDE.md`.
   Rewrite to a neutral but warm tone.
10. Cookie banner RU body is verbose — 119 chars vs EN 113. Reads stiff.
    Tighten.
11. `finalCta.trustItems` includes "Cancel anytime" / "Отмена в любой
    момент" — there is no subscription to cancel. Self-contradiction
    against pricing copy "No recurring fee". Replace.
12. Pricing card "Compare:" line reads as fine-print caption when the
    competitor delta is the strongest conversion lever on the section.
    Promote it visually.
13. Logos bar text-and-icon pairs are uniformly text-tertiary — too
    quiet at 1920, looks abandoned. Lift to text-secondary on default,
    keep tertiary only on hover-out.
14. App pages, setup wizard, Gmail wizard, legal pages — design-system
    tokens applied but still feel like internal tools, not premium
    product surfaces. V2 closes that gap with three concrete tweaks per
    surface (no structural rewrites).
15. **Slang and unexplained jargon** across both locales — `indie maker`
    / `инди-мейкер` in the hero eyebrow, `wizard` mixed with Cyrillic,
    `алиас`, `гуглишь`, `дебажишь`, bare acronyms `DKIM/SPF/DMARC` in
    body copy aimed at SMB. Owner directive 2026-04-28: the audience
    is mixed (devs + small business owners + freelancers + non-tech
    founders); copy must be plain enough for non-tech reader without
    losing the technical credibility floor that makes the product
    legible to a developer. Full sweep with EN+RU replacements lives
    in §4.13.

Everything else in this document is additive polish or copy refinement.

---

## 1. Design system additions to V1

V1 tokens stay. V2 adds three things to the system.

### 1.1 Surface contrast pair

V1 has `surface-base` (`#0A0A0B`) and `surface-elevated` (`#131314`).
The elevated tier reads as the same color at 1920 because the delta is
only 9 points. Add a second elevated tier for product mockups and
pricing cards, where we need a hard visual lift off the page:

- `surface-elevated-2` dark: `#1A1A1D`
- `surface-elevated-2` light: `#FFFFFF` (already white — light mode
  already has the contrast, this token is dark-mode only). Light-mode
  fallback maps to existing `surface-elevated`.

Use `surface-elevated-2` on: Gmail compose mockup container, pricing
card, automation/functional guarantee cards. Everything else stays on
`surface-elevated`.

### 1.2 Mockup tilt utility

V1 `mk-mockup-tilt` is defined but resolves to `transform: none` in the
shipped `globals.css` (verify and fix). Restore the original spec:

```css
.mk-mockup-tilt {
  transform: rotateY(-4deg) rotateX(2deg) translateZ(0);
  transform-origin: center;
  transform-style: preserve-3d;
  transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (max-width: 1023px) {
  .mk-mockup-tilt { transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .mk-mockup-tilt { transform: none; transition: none; }
}
```

The tilt is the single biggest "premium" cue in the hero — without it
the mockup reads as flat UI screenshot.

### 1.3 Gradient text utility (one place only)

For the Display-1 last line on the hero we currently use solid
`text-mk-text-secondary` to muted the third line. V2 swaps that to a
subtle vertical gradient — 100% to 60% opacity of `text-mk-text-primary`
top-to-bottom. Reads as more intentional than a flat gray.

```css
.mk-display-fade {
  background: linear-gradient(180deg,
    var(--mk-text-primary) 0%,
    rgba(250, 250, 250, 0.55) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
```

Light-mode equivalent uses `rgba(10, 10, 11, 0.55)` for the bottom
stop. Apply ONLY to the hero headline's third line. Nowhere else — once
on a page, it's a focal point; twice and it becomes decoration.

---

## 2. Brand assets (carry-over from V1 §7.5, finalize)

### 2.1 Wordmark casing — final decision

Use `Mailkit` (capital M, lowercase rest). Rationale:

- V1 §7.5 revision explicitly settled on this form.
- Linear, Vercel, Cursor, Resend all use lower-or-mixed casing — the
  premium pattern in 2026 SaaS.
- `MailKit` (camel) reads as 2010s SaaS naming convention.

Update both locales:

```json
// messages/en.json
"landing.header.logo": "Mailkit"
// messages/ru.json
"landing.header.logo": "Mailkit"
```

App header (`components/app/app-header.tsx`) uses the same key — verify
it picks up the change.

### 2.2 Trailing accent dot — actually remove

Audit pass for any hard-coded dot:

- `components/landing/header.tsx` — clean per current code.
- `components/app/app-header.tsx` — verify, remove if present.
- Check for `<span className="...bg-mk-accent...rounded-full">` after
  the wordmark in any layout.
- Re-run prod screenshots after fix to confirm the dot disappears in
  the header close-up.

If the dot is gone in code but visible in the header close-up, the
screenshot is from an earlier deploy — re-capture after merge.

### 2.3 SVG icon source

Create `public/brand/mailkit-icon.svg` from the existing PNG by
vector-tracing (Inkscape Trace Bitmap, Adobe Illustrator Image Trace,
or vectormagic.com). Specs:

- 64×64 viewBox
- Rounded square envelope flap, accent gradient fill
  `linear-gradient(135deg, #6B4FE6 0%, #7C5CFF 100%)`
- White inner flap-line at 1.5px stroke
- Anti-aliased, no embedded raster

In `header.tsx` and `app-header.tsx` swap `next/image` PNG for inline
SVG (or `next/image` with the new `.svg` source). Drop the explicit
`width/height` 24×24 attrs — let `className="size-6"` handle it.

Keep `mailkit-icon.png` for backward compatibility (email templates
needing raster) until the email wrapper update lands.

### 2.4 Favicon-16 pixel-art version

Create `public/favicon/favicon-16-pixel.png` by hand:

- 16×16 grid
- Solid `#7C5CFF` rounded rectangle 14×11 with 1px padding sides, 2px
  top/bottom
- White diagonal flap-line — only the upper triangle, no inner detail
- No anti-aliasing, hard pixel edges

In `app/[locale]/layout.tsx` `generateMetadata` change the 16×16 entry
URL to point to `/favicon/favicon-16-pixel.png` (keep `sizes="16x16"`).
The other sizes keep using the regular favicon-N.png.

---

## 3. Cookie consent banner — full rebuild

This is the highest-impact fix in V2. Current behavior breaks the
primary hero conversion path on the most common viewports.

### 3.1 Diagnosis

`components/cookie-consent.tsx` line 69:

```
fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[520px] ...
sm:left-auto sm:right-6 sm:bottom-6 sm:mx-0
```

On mobile (sm-) the banner spans the full width 16px from edges and
sits at bottom-4, which on a 9898px-tall page renders right where the
hero CTA sits in the initial viewport.

On sm+ the banner is 520px right-aligned at bottom-6 — which at 1280
viewport puts it directly over the Gmail mockup right column.

### 3.2 Fix — three changes

**(a) Compact form factor.** Drop the card style. Replace with a thin
horizontal pill bar:

- Height: 56px desktop / 64px mobile (auto for two-line copy)
- Width: max-content desktop, full-bleed minus 16px on mobile
- Position: fixed bottom-center desktop (`left-1/2 -translate-x-1/2 bottom-4`),
  fixed bottom-edge mobile (`left-2 right-2 bottom-2`)
- Background: `surface-elevated-2/95` with backdrop-blur-md
- Border: 1px `border-mk-border-strong`
- Radius: 999px (full pill) on desktop, 16px on mobile

**(b) Tighter copy.** New strings:

```json
// EN
"cookieConsent": {
  "body": "Sign-in and language cookies only — no tracking.",
  "details": "Privacy",
  "accept": "Got it"
}
// RU
"cookieConsent": {
  "body": "Cookies только для входа и языка. Без трекинга.",
  "details": "Конфиденциальность",
  "accept": "Принять"
}
```

(`Принять` reads more natural than `Понятно` in this context — `Понятно`
sounds slightly dismissive in RU.)

**(c) Above-the-fold suppression.** On first paint, delay banner mount
until either:
- User scrolls past 100vh (IntersectionObserver on a sentinel element
  placed below the hero), OR
- 4 seconds elapsed since first paint, whichever comes first.

This keeps the hero's first impression clean. Implementation:

```tsx
// components/cookie-consent.tsx
useEffect(() => {
  if (typeof window === "undefined") return;
  const sentinel = document.getElementById("hero-end-sentinel");
  let didSet = false;
  const showOnce = () => {
    if (didSet) return;
    didSet = true;
    setShouldShow(readInitialShouldShow());
  };
  const t = setTimeout(showOnce, 4000);
  const io = sentinel
    ? new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) showOnce();
      })
    : null;
  if (sentinel && io) io.observe(sentinel);
  return () => { clearTimeout(t); io?.disconnect(); };
}, []);
```

Add `<div id="hero-end-sentinel" aria-hidden className="h-px" />` at
the bottom of `hero.tsx` (after the grid, before `</section>`).

`shouldShow` initial state becomes `false` on both server and client.
This shifts the trade-off: a returning user with banner already
dismissed still sees nothing (localStorage check returns null inside
showOnce after gate), and first-time users see the banner only after
they've left the hero.

---

## 4. Landing — section-by-section V2 deltas

### 4.1 Announcement banner

V1 styling stands. Two copy fixes:

```json
// messages/en.json — landing.announcementBanner
{
  "message": "Launch week — first 100 setups free with promo FIRST100",
  "cta": "How it works →",        // was "See how →"
  "dismiss": "Dismiss banner"
}
// messages/ru.json
{
  "message": "Старт продаж — первые 100 настроек бесплатно по промокоду FIRST100",
  "cta": "Подробнее →",            // was "Как →" — orphaned word
  "dismiss": "Закрыть баннер"
}
```

`Launch week` → `Старт продаж` reads more natural to RU SMB audience
than the calque `Launch week`. The English version stays in EN — it's
indie-hacker idiom there.

### 4.2 Header

V1 structure stands. Three deltas:

1. Wordmark to `Mailkit` (§2.1).
2. Trailing dot removed (§2.2).
3. Add `Sign in` icon affordance — currently text-only, easy to miss.
   Add `<LogIn className="size-3.5 opacity-60" />` icon left of the
   text (lucide-react). 6px gap.
4. On scrolled state: add `shadow-[0_1px_0_rgba(0,0,0,0.4)]` so the
   sticky header has a hairline definition against the page. Currently
   the border-bottom alone disappears against `surface-base`.

### 4.3 Hero

Five deltas. Layout structure (7/5 split, eyebrow, three-line headline,
subhead, dual CTA, trust microcopy, mockup) stays.

**(a) Headline third line gradient.** Apply `mk-display-fade` (§1.3) to
the third `<span>` in `<h1>`. Removes the flat-gray look.

**(b) Mockup container surface lift.** Change in `hero.tsx`
`GmailComposeMockup`:

```diff
- className="mk-mockup-tilt rounded-2xl border border-mk-border-strong bg-surface-elevated p-5 mk-card-shadow"
+ className="mk-mockup-tilt rounded-2xl border border-mk-border-strong bg-surface-elevated-2 p-5 mk-card-shadow-strong"
```

Add `mk-card-shadow-strong` to `globals.css`:

```css
.mk-card-shadow-strong {
  box-shadow:
    0 1px 0 rgba(255,255,255,0.06) inset,
    0 24px 48px -12px rgba(0,0,0,0.5),
    0 0 0 1px rgba(255,255,255,0.04);
}
```

Light mode equivalent uses `rgba(0,0,0,0.16)` for the drop and
`rgba(0,0,0,0.04)` for the inner ring.

**(c) Restore tilt.** §1.2.

**(d) Mockup gets one extra row.** Above the existing toolbar, add a
faux Gmail nav row to anchor the screenshot in viewer's mental model:

```tsx
<div className="mb-3 flex items-center justify-between text-[10px] text-mk-text-tertiary">
  <span className="font-medium">Inbox · Compose</span>
  <span className="font-mono">{t("draftSavedLabel")}</span>
</div>
```

Strings:
- EN: `"draftSavedLabel": "Draft saved"`
- RU: `"draftSavedLabel": "Черновик сохранен"`

**(e) Mobile mockup width.** At `< lg` the mockup is wrapped in
`max-w-md` (448px) which on a 390px viewport with 16px gutters leaves
no horizontal breathing room — the mockup touches both sides. Change
to `max-w-[calc(100vw-32px)] sm:max-w-md`.

### 4.4 Logos bar (`integrations-bar.tsx`)

V1 stands. Two deltas:

1. Logo-and-text pairs use `text-mk-text-secondary` by default, drop to
   `text-mk-text-tertiary` on `[data-state="rest"]` after 200ms idle —
   wait, simpler: just bump default to secondary, leave hover at
   primary. Keeps the bar legible at 1920.
2. Eyebrow copy: replace the implicit "trusted by" hand-wave with a
   factual line.

```json
// EN
"landing.integrationsBar.eyebrow": "Built on Cloudflare, Brevo, and Google APIs"
// RU
"landing.integrationsBar.eyebrow": "Работает на Cloudflare, Brevo и Google API"
```

Removes the `"Built on infrastructure trusted by millions"` line which
is generic SaaS-speak and unprovable.

### 4.5 Problem section

Headline + subhead stay. Two deltas:

**(a) Card height parity.** Right card (Automated, 4 steps) and left
card (Manual, 5 steps) have different heights, breaking the side-by-
side rhythm. Add `min-height: 100%` to both cards within an aligned
flex parent, and pad bottom of the shorter card to match.

**(b) RU step copy — full rewrite.** Drop dev-jargon, neutral tone,
broader audience:

```json
// messages/ru.json — landing.problem.without.steps
[
  "Ищешь сервисы маршрутизации почты",
  "Читаешь документацию Brevo SMTP — два раза",
  "Вручную вводишь пять DNS записей",
  "Разбираешься почему не верифицируется DKIM",
  "Настраиваешь Gmail Send-As самостоятельно"
]
// landing.problem.with.steps
[
  "Входишь через Google",
  "Вставляешь токен Cloudflare",
  "Смотришь как идет автоматическая настройка (~90 сек)",
  "Копируешь четыре строки в Gmail"
]
```

EN copy stays — already neutral.

### 4.6 How it works section

Two deltas to resolve the headline-vs-cards mismatch.

**(a) Headline rewrite.**

```json
// EN
"landing.howItWorks.heading": "Four steps. We do three. You do one."
// RU
"landing.howItWorks.heading": "Четыре шага. Мы делаем три. Один — твой."
```

The pattern echoes the existing rhythm but matches the visual count.

**(b) Visual grouping.** The first three cards (Automated) and the
fourth (Your turn) need a visible separator to communicate the
hand-off. In `how-it-works-section.tsx`:

```tsx
<ol className="relative grid gap-6 lg:grid-cols-[repeat(3,minmax(0,1fr))_8px_minmax(0,1fr)] lg:gap-6">
  <StepCard ... /> {/* 01 */}
  <StepCard ... /> {/* 02 */}
  <StepCard ... /> {/* 03 */}
  <div aria-hidden className="hidden lg:block self-stretch w-px bg-mk-border-strong mx-1" />
  <StepCard ... /> {/* 04 */}
</ol>
```

On mobile the divider is hidden — the vertical stack already
communicates separation. The connecting line element (lines 46–53)
needs to also break at column 3 — convert from a single `inset-x-12`
gradient strip to two strips: one `inset-x-12 right-[28%]` (cards 1–3)
and one `inset-x-[78%]` (just decorative dot at start of card 4).

Drop the time pill from inside cards. Keep just the eyebrow time
in the body line ("In 15 seconds, we enable Email Routing...") to
reduce visual noise. Each card already has 5 distinct visual elements;
6 is over the readability threshold.

### 4.7 Pricing section

Three deltas. Headline + subhead stay.

**(a) Pricing card uses `surface-elevated-2`**. Same lift as the hero
mockup. Currently it's on `surface-elevated` and reads same as the
problem cards above it; it should feel like the climax of the page.

**(b) Promote the comparison line.** Currently a 13px caption far below
the card. Move it INTO the card as a "Compare" microsection between
the inclusions list and the CTA:

```tsx
<div className="rounded-lg bg-surface-base/40 border border-mk-border-subtle p-3 mb-4">
  <p className="mk-caption text-mk-text-tertiary mb-2">{t("compareLabel")}</p>
  <ul className="grid grid-cols-3 gap-3 text-center">
    <li>
      <p className="mk-body-small font-mono text-mk-text-secondary">$6/mo</p>
      <p className="text-[11px] text-mk-text-tertiary">Workspace</p>
    </li>
    <li>
      <p className="mk-body-small font-mono text-mk-text-secondary">$9/mo</p>
      <p className="text-[11px] text-mk-text-tertiary">ImprovMX</p>
    </li>
    <li>
      <p className="mk-body-small font-mono text-mk-accent font-semibold">$5 once</p>
      <p className="text-[11px] text-mk-accent">MailKit</p>
    </li>
  </ul>
</div>
```

New strings:
```json
// EN
"landing.pricing.compareLabel": "Compare per year"
// RU
"landing.pricing.compareLabel": "Сравни за год"
```

The current `compare` line stays as a fallback below the card, but
becomes a reinforcement, not the main pricing argument.

**(c) Add micro-FAQ link below the card.**

```tsx
<p className="mk-caption text-mk-text-tertiary mt-6 text-center">
  <a href="#faq" className="hover:text-mk-text-secondary underline-offset-4 hover:underline">
    {t("faqLink")}
  </a>
</p>
```

```json
// EN
"landing.pricing.faqLink": "Have questions before paying? Read the FAQ →"
// RU
"landing.pricing.faqLink": "Есть вопросы до оплаты? FAQ ниже →"
```

### 4.8 Trust / guarantee section

V1 structure stands. Two deltas:

**(a) Card surface to `elevated-2`.** Same logic as pricing.

**(b) Add a third inline pill below the headline** that names the policy
URL once, reducing the `Read full policy →` cognitive distance:

```tsx
<a
  href="/guarantee"
  className="inline-flex items-center gap-2 rounded-full border border-mk-border-strong bg-surface-elevated/60 px-3 py-1 mk-caption text-mk-text-secondary hover:bg-surface-elevated hover:text-mk-text-primary transition-colors"
>
  <Shield className="size-3" aria-hidden />
  {t("policyPill")}
</a>
```

```json
// EN
"landing.trust.policyPill": "Two policies, plain language, /guarantee"
// RU
"landing.trust.policyPill": "Две политики, простым языком, /guarantee"
```

The `Read full policy →` link below the cards remains for accessibility
but the pill anchors the eye.

### 4.9 FAQ section

V1 stands. One delta.

Question count check. Current `messages/{en,ru}.json` may carry more
than 10 entries. Trim to exactly 10 prioritized:

1. How much does MailKit cost?
2. Can I do this myself for free?
3. Why $5 once vs Google Workspace $6/mo?
4. What if my setup fails?
5. What domains work?
6. Why is the Gmail step not automated?
7. Is my Cloudflare token safe?
8. What if my emails go to spam?
9. How is this different from ImprovMX?
10. Do you support Google Workspace?

Drop entries about Cloudflare API token re-use, custom domain registrar
support details, etc. — those go to a future `/help` page.

Reorder so financial questions (#1, #3) sit first — that's the conversion
gate; technical questions move below.

### 4.10 Final CTA section

V1 stands. One delta — fix the "Cancel anytime" contradiction.

```json
// EN
"landing.finalCta.trustItems": [
  "Money-back guarantee",
  "No subscription, ever",
  "Setup in 5 minutes",
  "Honest, refund-first policy"
]
// RU
"landing.finalCta.trustItems": [
  "Гарантия возврата",
  "Никаких подписок",
  "Настройка за 5 минут",
  "Возврат денег без вопросов"
]
```

`Cancel anytime` → removed. There's nothing to cancel; the badge was
copy-paste from a SaaS subscription template.

### 4.11 Footer

V1 prescribes 5 columns; current implementation likely has 4. V2 keeps
4 columns to avoid stretching with empty content. Two deltas:

**(a) Drop the `Resources` column** until /help, /status, /changelog
exist. Replace with a single text block in the `Product` column linking
to the same anchors plus a short tagline.

**(b) Add `Built in public` link** in the Contact column linking to the
GitHub repo. Reinforces the indie-hacker positioning and is concrete
trust signal (skeptics can verify the codebase).

```json
"landing.footer.builtInPublic": "Built in public — GitHub →"
```

### 4.12 Section spacing audit

Current section gaps in `*-section.tsx` use `py-24 sm:py-32`. V1 spec
said 120px desktop (≈py-30) / 80px mobile (py-20). Bring all sections
into alignment: `py-20 sm:py-30 lg:py-32`. Five sections × two
breakpoints — touch each one.

### 4.13 Plain-language sweep — all surfaces, both locales

Owner directive 2026-04-28: target audience is mixed (indie devs +
SMB owners + freelancers + non-tech founders). Drop slang, keep
moderate technical vocabulary tied to the product. The rule: terms
that name our actual deliverable (`Cloudflare Email Routing`, `Brevo
SMTP`, `DKIM`, `Gmail Send-As`) stay — they're the credibility floor
for tech-aware visitors and we explain them inline for the rest.
Slang and unexplained jargon (`indie maker`, `wizard` mixed in RU,
`copy-paste` in Cyrillic prose, `алиас`, `дебажишь`, `гуглишь`,
`инди-мейкер`) — gone.

This section is exhaustive. Every flagged string has an explicit
EN+RU replacement. Apply mechanically.

#### 4.13.1 Hero

```json
// messages/en.json — landing.hero
{
  "eyebrow": "Email setup for small teams, founders, and freelancers",
  "subhead": "We configure Cloudflare Email Routing, Brevo SMTP, and the DNS records that prove your email is real. You copy-paste four lines into Gmail. That's the whole product."
}
// messages/ru.json — landing.hero
{
  "eyebrow": "Настройка почты для малого бизнеса, основателей и фрилансеров",
  "subhead": "Мы настраиваем Cloudflare Email Routing, Brevo SMTP и служебные DNS-записи, которые подтверждают подлинность твоей почты. Ты копируешь четыре строки в Gmail. Это весь продукт."
}
```

Was: `indie makers and small teams` / `инди-мейкеров и малых команд`.
Now: explicit audience names — independent dev still recognizes
themselves as `founder` or `freelancer`, SMB owner doesn't bounce on
unknown slang.

`DKIM/SPF/DMARC` collapsed into `the DNS records that prove your email
is real` / `служебные DNS-записи, которые подтверждают подлинность
твоей почты`. Tech reader still recognizes what we mean; non-tech
reader gets a one-line plain-language explanation.

#### 4.13.2 Hero trust microcopy

```json
// EN
"landing.hero.trustNote": "30-day money-back guarantee. Automatic refund if our setup fails."
// RU
"landing.hero.trustNote": "Гарантия возврата 30 дней. Автоматический возврат, если наша настройка дала сбой."
```

Was RU: `Возврат денег 30 дней. Авто-возврат при сбое настройки.`
The `Авто-` prefix mixed with Cyrillic noun reads telegraphic.
Replace with full word.

#### 4.13.3 Logos bar

V2 §4.4 already changed the eyebrow to factual. Confirm final form:

```json
// EN
"landing.integrationsBar.eyebrow": "Built on Cloudflare, Brevo, and Google APIs"
// RU
"landing.integrationsBar.eyebrow": "Работает на Cloudflare, Brevo и Google API"
```

#### 4.13.4 Problem section — RU full pass

Builds on V2 §4.5. Final RU strings:

```json
// messages/ru.json — landing.problem
{
  "without": {
    "title": "Ручная настройка",
    "duration": "60–90 мин",
    "steps": [
      "Ищешь сервис маршрутизации почты для домена",
      "Читаешь документацию Brevo SMTP — два раза",
      "Вручную вводишь пять DNS-записей",
      "Разбираешься почему не проходит проверка DKIM",
      "Самостоятельно настраиваешь Gmail Send-As"
    ]
  },
  "with": {
    "title": "С MailKit",
    "duration": "5 мин",
    "steps": [
      "Входишь через Google",
      "Вставляешь ключ доступа Cloudflare",
      "Ждешь автоматическую настройку (около 90 секунд)",
      "Копируешь четыре строки в настройки Gmail"
    ]
  }
}
```

Changes vs V2 §4.5 draft: `токен Cloudflare` → `ключ доступа
Cloudflare` (SMB-friendly), `автоматизация` → `автоматическая
настройка` (короче и яснее), `Автоматизировано` title → `С MailKit`
(меньше абстракции, прямой контраст с `Ручная настройка`).

EN problem section stays as-is — already neutral.

#### 4.13.5 How it works — step bodies

Step bodies currently mention internals (`shared Brevo account`,
`brevo-code records`, `DMARC alignment`) that mean nothing to SMB.
Rewrite to the user-visible outcome:

```json
// messages/en.json — landing.howItWorks
{
  "step1": {
    "title": "Cloudflare Email Routing",
    "time": "~15 sec",
    "body": "We turn on email routing for your domain and add the records that let it receive mail."
  },
  "step2": {
    "title": "Brevo SMTP authentication",
    "time": "~60 sec",
    "body": "We register your domain in our Brevo account and add the signature records that prove your email is yours."
  },
  "step3": {
    "title": "DNS verification",
    "time": "~30 sec",
    "body": "We check the records are live and Gmail will accept email signed by your domain."
  },
  "step4": {
    "title": "Gmail Send-As",
    "time": "~3 min",
    "body": "We hand you four lines — server, port, login, password — and walk you through pasting them into Gmail. Gmail then sends a confirmation link, you click it, done."
  }
}
// messages/ru.json — landing.howItWorks
{
  "step1": {
    "title": "Маршрутизация почты Cloudflare",
    "time": "~15 сек",
    "body": "Включаем маршрутизацию почты для твоего домена и добавляем записи, чтобы он мог принимать письма."
  },
  "step2": {
    "title": "Аутентификация Brevo SMTP",
    "time": "~60 сек",
    "body": "Регистрируем твой домен в нашем аккаунте Brevo и добавляем подписи, которые подтверждают, что письма действительно твои."
  },
  "step3": {
    "title": "Проверка DNS",
    "time": "~30 сек",
    "body": "Убеждаемся что записи на месте и Gmail будет принимать письма, подписанные твоим доменом."
  },
  "step4": {
    "title": "Gmail Send-As",
    "time": "~3 мин",
    "body": "Даем четыре строки — сервер, порт, логин, пароль — и проводим через вставку в настройки Gmail. Gmail присылает письмо для подтверждения, ты кликаешь по ссылке, готово."
  }
}
```

`Send-As` остается как название функции в Gmail — это официальный
термин Google, юзер встретит его в интерфейсе своего ящика.

#### 4.13.6 Pricing inclusions

```json
// messages/en.json — landing.pricing.inclusions
[
  "Cloudflare Email Routing setup",
  "Brevo SMTP authentication (sender verification, DKIM signature)",
  "Step-by-step Gmail Send-As walkthrough",
  "Unlimited extra addresses on your domain (no extra charge)",
  "30-day money-back guarantee",
  "Automatic refund if our setup fails"
]
// messages/ru.json — landing.pricing.inclusions
[
  "Настройка Cloudflare Email Routing",
  "Аутентификация Brevo SMTP (проверка отправителя, подпись DKIM)",
  "Пошаговый помощник для Gmail Send-As",
  "Дополнительные адреса на твоем домене без ограничений и без доплаты",
  "Гарантия возврата денег 30 дней",
  "Автоматический возврат при сбое нашей настройки"
]
```

Changes:
- `wizard` (English term inside RU prose) → `пошаговый помощник`.
- `алиасы` (jargon) → `дополнительные адреса` (plain).
- `Брево` style fully formal `Brevo SMTP`.
- EN `Guided Gmail Send-As wizard` → `Step-by-step Gmail Send-As walkthrough`.
- DKIM мention preserved для tech-credibility но в контексте `подпись DKIM` / `DKIM signature`, не голым акронимом.

#### 4.13.7 Trust / guarantee section

```json
// EN — landing.trust.subhead
"Two clear guarantees, written in plain language."
// RU — landing.trust.subhead
"Две понятные гарантии, написанные простым языком."
```

Was: `Two-tier guarantee that does the talking, not the marketing.` /
`Двухуровневая гарантия, которая работает за нас, а не маркетинг.`
The `does the talking, not the marketing` phrase is meta-marketing
itself — clever but opaque. Replace with the literal claim.

#### 4.13.8 FAQ — question rewrites

Current question copies are mostly fine. Three rewrites for clarity:

```json
// EN
"landing.faq.q1.question": "Do I have to keep paying every month?"
"landing.faq.q4.question": "What happens if the setup fails halfway?"
"landing.faq.q6.question": "Why doesn't MailKit fully automate the Gmail step?"
// RU
"landing.faq.q1.question": "Надо ли платить каждый месяц?"
"landing.faq.q4.question": "Что будет, если настройка прервется на полпути?"
"landing.faq.q6.question": "Почему MailKit не делает все за меня в Gmail?"
```

Other FAQ entries — apply same rule when rewriting bodies: keep
`DKIM`, `SPF`, `DMARC`, `Cloudflare`, `Brevo`, `Gmail Send-As`,
`SMTP`, `DNS` — explain inline first time used, then use freely.

#### 4.13.9 Final CTA

```json
// EN — landing.finalCta.trustItems  (already updated in §4.10)
[
  "30-day money-back guarantee",
  "No subscription, ever",
  "Setup in 5 minutes",
  "Refund-first policy, no questions asked"
]
// RU — landing.finalCta.trustItems
[
  "Гарантия возврата 30 дней",
  "Без подписок, никогда",
  "Настройка за 5 минут",
  "Сначала возвращаем деньги, потом задаем вопросы"
]
```

#### 4.13.10 Footer tagline

```json
// EN
"landing.footer.tagline": "Email on your domain. Setup in 5 minutes. Backed by a 30-day guarantee."
// RU
"landing.footer.tagline": "Почта на твоем домене. Настройка за 5 минут. С гарантией возврата 30 дней."
```

Was V1: `Email on your domain. In 5 minutes. Guaranteed.` —
telegraphic to the point of unclear. New version is one sentence
longer but reads as a complete statement.

#### 4.13.11 Glossary discipline (developer-facing rule)

Going forward, when adding new strings to `messages/{en,ru}.json`,
follow:

| Stay | First-mention explanation required | Avoid |
|---|---|---|
| Cloudflare | none — brand name | "роутер DNS" (jargon) |
| Brevo | none — brand name | "SMTP-провайдер" alone |
| Gmail | none — brand name | — |
| DKIM | "DKIM signature" / "подпись DKIM" | acronym alone in user copy |
| SPF | "SPF policy" / "политика SPF" | acronym alone |
| DMARC | "DMARC alignment" / "DMARC проверка" | acronym alone |
| MX record | "MX record" / "MX-запись" — fine | "the MX" |
| DNS | "DNS records" / "DNS-записи" — fine | "the DNS" |
| Send-As | "Gmail Send-As" — fine | "wizard" (in RU) |
| OAuth | "Google sign-in" / "вход через Google" preferred | "OAuth flow" в hero copy |
| token | "API token" EN / "ключ доступа" RU | "токен" without context |

Slang to ban from all user-facing copy:
- EN: `indie maker`, `vibe-code`, `hack`, `ship`, `crush it`, `dope`,
  `slick` — any startup-Twitter dialect.
- RU: `инди-мейкер`, `гуглишь`, `дебажишь`, `залогиниться`,
  `апнуть`, `запушить`, `закоммитить`, `алиас` (use `дополнительный
  адрес`), `wizard` латиницей в кириллической прозе.

Acceptance check for §4.13: grep both message files for any of the
banned terms after merge — should return zero.

---

## 5. App pages — V2 polish

V1 said apply design system tokens. Most are applied. V2 takes app
pages from "internal tool look" to "premium consumer surface".

### 5.1 Dashboard `/app`

**(a) Top hero strip.** Above the existing sections add a 96px-tall
hero strip with a personalized greeting:

```tsx
<section className="border-b border-mk-border-subtle">
  <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <p className="mk-eyebrow text-mk-accent">{t("dashboard.eyebrow")}</p>
    <h1 className="mk-heading-1 mt-2 text-mk-text-primary">
      {t("dashboard.greeting", { name: user.firstName })}
    </h1>
    <p className="mk-body-regular mt-3 text-mk-text-secondary max-w-prose">
      {t("dashboard.subhead")}
    </p>
  </div>
</section>
```

```json
// EN
"app.dashboard.eyebrow": "Your account"
"app.dashboard.greeting": "Welcome back, {name}."
"app.dashboard.subhead": "Manage your domains, view past setups, contact support, or buy another mailbox."
// RU
"app.dashboard.eyebrow": "Твой аккаунт"
"app.dashboard.greeting": "С возвращением, {name}."
"app.dashboard.subhead": "Управляй доменами, смотри прошлые настройки, пиши в поддержку или докупи ящик."
```

**(b) Empty state for setups list.** Currently shows a flat "No setups
yet" line. Replace with:

```tsx
<div className="rounded-2xl border border-dashed border-mk-border-strong bg-surface-elevated p-12 text-center">
  <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-mk-accent/10">
    <Mail className="size-6 text-mk-accent" />
  </div>
  <h3 className="mk-heading-3 text-mk-text-primary">{t("emptyState.title")}</h3>
  <p className="mk-body-regular mt-2 text-mk-text-secondary max-w-md mx-auto">
    {t("emptyState.body")}
  </p>
  <a href="/pricing" className="mk-cta-shadow mt-6 inline-flex h-11 items-center rounded-[10px] bg-mk-accent px-5 text-sm font-semibold text-white hover:bg-mk-accent-hover">
    {t("emptyState.cta")}
  </a>
</div>
```

**(c) Status badges** — already pill-shaped per V1. Change refunded
status from neutral gray to amber (warning token) so it visually
differentiates from "completed" without alarming. Add a `<Tooltip>`
on hover with the refund reason from `refunds.reason`.

### 5.2 Setup wizard `/app/setup`

V1 stands. Two deltas:

**(a) Step progress sidebar replaces top progress bar.** On `lg+`
viewport, push the step list into a 240px sticky left sidebar so the
main column is dedicated to the active step's form/copy. On mobile
collapse to top horizontal pill row showing only current/total.

**(b) Active step adds a "you are here" indicator.** A 3px accent
border-left + 8% accent background tint on the active step card. V1
said this — verify it's actually rendering and not hidden by another
override.

### 5.3 Gmail wizard

V1 said add inline SVG schematics for each step. Verify they're in
prod; if `gmail-step-schematic.tsx` exists but renders text-only,
this is the target.

V2 deltas:

**(a) Copy-paste field card UX.** Each SMTP field (server, port, login,
password) sits in its own card with:
- Label `Caption text-tertiary uppercase tracking-wider`
- Value `Mono 16px text-primary`
- Copy button: ghost button with `Copy` icon → swaps to `Check` on click,
  toast `"Copied"` / `"Скопировано"`, button label changes for 1.5s.
- Password field gets a `Show / Hide` toggle (`Eye / EyeOff` icons).

**(b) Verification waiting state.** When user clicks "I've pasted into
Gmail", show a stepper of 4 sub-checks with `Loader2` spinning then
`CheckCircle2` settled:
- Inbox connection
- Verification email received
- Verification link clicked
- Send-As enabled

Each check has a 30-sec timeout — on fail, show a friendly diagnostic
hint and link to support.

**(c) Schematic SVGs at 16/9 ratio.** Verify present. If text-only
fallback, ship six minimal SVGs:
- `gmail-step-1.svg` — Gmail settings gears
- `gmail-step-2.svg` — Add address form schematic
- `gmail-step-3.svg` — SMTP form fields highlighted
- `gmail-step-4.svg` — Envelope with verification tick
- `gmail-step-5.svg` — Compose window with From dropdown highlighted
- `gmail-step-6.svg` — Success card with green check

Brand-consistent: stroke 1.5px, fill `surface-elevated`, accent
highlights `#7C5CFF` only on the field-of-interest in each step.

### 5.4 App header

Mirror the §4.2 header changes: wordmark, dot removal, SVG icon.

---

## 6. Legal pages

`/terms`, `/privacy`, `/guarantee`. V1 said apply prose typography. V2
deltas:

**(a) Sticky TOC sidebar on `lg+`.** Currently the docs read as one
long flow. Add a 240px sticky right rail with section anchors. Mobile:
collapse to a `<details>` summary at top.

**(b) Last-updated badge.** Top-right of the doc title row, pill style.
`Caption · text-tertiary · border 1px subtle · padding 4px 10px ·
rounded-full`. Format `"Updated 2026-04-25"` / `"Обновлено 25.04.2026"`.

**(c) Inline Mono code style.** Currently terms like `SPF`, `DKIM`,
`smtp-relay.brevo.com` render in body weight. Wrap in `<code>` with:
```css
code { font-family: var(--font-geist-mono); font-size: 0.92em;
       padding: 1px 6px; border-radius: 4px;
       background: var(--mk-border-subtle); color: var(--mk-text-primary); }
```

**(d) "Why this exists" lede.** Each legal page gets a 1-paragraph
plain-language summary at the top, before the formal sections, framed
in a slightly elevated callout. Removes the "wall of legal text" first
impression.

EN/guarantee lede:
> "MailKit costs $5. If our setup fails on our end, you get the $5
> back automatically within 24 hours. If within 30 days you can't
> actually send email through your domain, you also get your $5 back —
> just email support. The full policy below explains the edge cases."

RU/guarantee lede:
> "MailKit стоит $5. Если наша автоматика сломалась на нашей стороне —
> возврат автоматический в течение 24 часов. Если в течение 30 дней не
> можешь реально отправлять почту со своего домена — тоже возврат, по
> запросу в support. Ниже — точная политика для краевых случаев."

Same pattern for /terms and /privacy with 2-3 sentence summaries.

---

## 7. Email templates

V1 specs the wrapper. V2 deltas:

**(a) Logo URL** — point to `https://getmailkit.com/brand/mailkit-logo-full.png`
(already exists, keep). Set explicit `width="120"` on `<img>` so Outlook
desktop doesn't auto-scale.

**(b) Dark-mode awareness via `prefers-color-scheme`.** Apple Mail and
some clients honor it. Add:

```html
<style>
  @media (prefers-color-scheme: dark) {
    body { background: #0A0A0B !important; }
    .container { background: #131314 !important; }
    h1 { color: #FAFAFA !important; }
    p { color: #A1A1AA !important; }
    .button { background: #7C5CFF !important; }
    .footer p { color: #71717A !important; }
  }
</style>
```

Outlook ignores CSS most of the time — light mode is the safe default.

**(c) Footer links** — add `support@getmailkit.com` as a plain text mailto:
in addition to `<a href="mailto:...">`. Some clients strip the link;
text fallback is critical for support discoverability.

**(d) Subject line consistency.** All transactional emails should
share a prefix style:

- `MailKit · Setup complete on yourdomain.com` (success)
- `MailKit · Refund issued — $5` (auto-refund)
- `MailKit · Action needed — re-paste credentials` (rotation)

The middle dot prefix is a small premium signal in inbox lists.

---

## 8. Edge states

### 8.1 Cookie banner — covered in §3.

### 8.2 Error boundary

V1 said `AlertTriangle size 48`. V2 swaps to a more visually distinctive
custom SVG: a stylized envelope with a small red dot in the corner.
Reads as "MailKit-specific error" not "generic Next.js error". 1 file:
`public/illustrations/error-state.svg`. Used by `app/[locale]/error.tsx`.

### 8.3 404

V1 deferred. V2 ships a minimal:

```tsx
<main className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
  <p className="mk-display-2 text-mk-text-tertiary">404</p>
  <h1 className="mk-heading-1 text-mk-text-primary">{t("notFound.title")}</h1>
  <p className="mk-body-regular max-w-md text-mk-text-secondary">{t("notFound.body")}</p>
  <div className="flex gap-3">
    <a href="/" className="mk-cta-shadow ...">{t("notFound.home")}</a>
    <a href="mailto:support@getmailkit.com" className="mk-link ...">{t("notFound.support")}</a>
  </div>
</main>
```

### 8.4 Loading skeletons

V1 prescribed. Verify they replace spinners on dashboard purchases
list. If still using `Loader2`, swap.

---

## 9. Anti-patterns (V1 §7 carried, V2 additions)

V1 anti-patterns stand. Adding three from this round:

11. **No "Cancel anytime" copy** — there's nothing to cancel; wording
    is misleading and contradicts the no-subscription positioning.
12. **No "5 minutes guaranteed"** as a literal copy claim. We only
    guarantee what's measurable per `GUARANTEE_POLICY.md`. The word
    "guaranteed" stays only in the headline tagline (linked to
    `/guarantee` for the full policy).
13. **No `Sparkle` / `Stars` icon spam.** V1 used `Sparkle` in the
    announcement banner — that's the only place. Don't repeat in hero,
    pricing, or CTA areas.

---

## 10. Acceptance criteria for `feat/design-v2`

Hard gates (no merge if any fail):

1. Cookie banner on mobile (390/414) does NOT visually overlap the
   hero CTA `Get your email — $5` on initial paint. Proof: fresh
   prod-390-en.png and prod-390-ru.png checked into
   `docs/ui-review/v2-current/`.
2. Header lockup shows `Mailkit` (capital M, lowercase rest) in both
   locales, no trailing accent dot. Proof: refreshed
   `docs/ui-review/header/header-{en,ru}-1920.png`.
3. Favicon-16 reads as a recognizable envelope mark in browser tab
   strip — pixel-art version, not downscaled raster. Proof: refreshed
   `docs/ui-review/favicon/favicon-16.png` and `browser-tab.png`.
4. "How it works" headline reads "Four steps. We do three. You do one."
   in EN / "Четыре шага. Мы делаем три. Один — твой." in RU. Visual
   group separator between cards 03 and 04 visible at lg+.
5. RU `landing.problem.without.steps` and `.with.steps` use the
   neutral copy from §4.5. No `Гуглишь / Дебажишь / Логинишься`.
5b. Plain-language sweep §4.13 applied across both locales. Hard
    bans (verified by grep before merge): `indie maker(s)`,
    `инди-мейкер(ы)`, `wizard` латиницей внутри RU prose, `алиас(ы)`,
    `гуглишь`, `дебажишь`, `залогиниться`, `токен` без `ключ доступа`
    рядом, голые акронимы `DKIM/SPF/DMARC` в hero subhead и в
    pricing inclusions.
6. `landing.finalCta.trustItems` no longer contains "Cancel anytime" /
   "Отмена в любой момент".
7. Hero Gmail mockup has visible 3D tilt at lg+ (rotateY -4deg
   rotateX 2deg) and elevated surface contrast vs page bg.
8. Pricing card has the inline 3-col compare grid (`Workspace $6/mo
   · ImprovMX $9/mo · MailKit $5 once`).
9. All 5 viewport × 2 locale screenshots refreshed and stored under
   `docs/ui-review/v2-current/prod-{1920|1280|768|414|390}-{en|ru}.png`.

Soft gates (nice-to-have, can land in follow-up if time-bound):

10. App dashboard hero strip with greeting.
11. Gmail wizard schematic SVGs.
12. Legal pages sticky TOC sidebar.
13. Email templates dark-mode awareness CSS.
14. 404 page.

Quality gates (V1 carried):

- `pnpm lint` clean
- `pnpm typecheck` clean
- `pnpm build` clean
- All existing Vitest + Playwright suites passing
- Lighthouse landing Perf ≥ 70 on `/en` and `/ru` (at least no
  regression vs current prod baseline of EN 73 / RU 70 per
  `CLAUDE.md` performance section).

---

## 11. Branch / scope / handoff

**Branch:** `feat/design-v2` from latest `main`.

**Scope (Claude Code is allowed to touch):**
- `components/landing/**`
- `components/app/**`
- `components/legal/**`
- `components/cookie-consent.tsx`
- `components/ui/**` (only if a primitive needs an accessibility tweak)
- `app/[locale]/**` (UI-level only — no business logic)
- `app/globals.css` (token additions per §1)
- `messages/en.json` and `messages/ru.json`
- `public/brand/**` (new SVG icon, no PNG removal yet)
- `public/favicon/**` (add favicon-16-pixel.png)
- `public/illustrations/**` (new error-state.svg)
- Tests: any UI render tests under `**/*.test.tsx`

**Out of scope (Claude Code must NOT touch):**
- Backend logic in `lib/integrations/**`, `lib/supabase/**`
- Database migrations
- Server actions in `app/[locale]/app/setup/**`
- `proxy.ts`, `instrumentation.ts`, sentry config
- `next.config.ts` (unless adding new image domains)

**One PR, no incremental etap split.** V2 is small enough to ship as
one artifact. Etap-split adds review overhead for a 2-3 day pass.

**Estimated effort:** 2-3 focused days. Most work is copy + targeted
component edits; no new pages, no new routes, no schema changes.

---

## 12. Post-merge QA loop (designer-side, not dev)

After dev confirms `feat/design-v2` is merged and prod is deployed:

1. Capture fresh prod screenshots into `docs/ui-review/v2-current/`.
2. Compare against the acceptance criteria table in §10.
3. If any hard gate fails — single point-fix directive back to dev,
   not a fresh pass.
4. Once all hard gates pass — ping owner with summary + preview link
   for visual approve. Owner approves OR returns specific items;
   designer iterates only on those.

This is the last designer-led pass before launch. Subsequent UI work
is feature-specific (Lemon Squeezy unblock, new emails, etc.) and not
cross-cutting design.
