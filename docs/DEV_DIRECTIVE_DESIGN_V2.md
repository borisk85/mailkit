# Dev Directive — feat/design-v2

Designer-to-developer handoff for the second design pass.

## What to read first

Open `docs/DESIGN_REVIEW_V2.md` and read it end-to-end before starting.
Sections 10 (acceptance criteria), 11 (scope), and 12 (QA loop) are the
contract. Sections 1–9 are the implementation detail per surface.

## Branch

`feat/design-v2` cut from latest `main`. Single PR, no etap split.

## Implementation order (suggested)

Land in this order — earlier blocks unblock screenshot QA on later ones:

1. **§1 design system additions** — `app/globals.css` only.
   Tokens + utility classes. Smallest surface area, highest leverage.
2. **§3 cookie consent rebuild** — fixes the most damaging UX bug.
   Get this in first so screenshots from later steps don't have the
   banner blocking elements.
3. **§2 brand assets** — wordmark casing in messages, dot audit, SVG
   icon source, favicon-16 pixel-art version. Update both Header and
   AppHeader to use the new SVG.
4. **§4 landing sections** — section-by-section. Order: hero, problem,
   how-it-works, pricing, trust, FAQ, finalCta, footer. Each section
   stands alone — partial merges are safe if you need to checkpoint.
5. **§5 app pages** — dashboard hero, setup wizard sidebar, Gmail
   wizard copy-paste cards + verification stepper.
6. **§6 legal pages** — sticky TOC, last-updated badge, inline `<code>`
   styling, "Why this exists" lede.
7. **§7 email templates** — wrapper polish, dark-mode CSS, subject line
   prefix consistency.
8. **§8 edge states** — error boundary illustration, 404 page,
   skeleton verification.

## Hard guardrails

- Do NOT touch anything under `lib/integrations/**`,
  `lib/supabase/**`, server actions, database migrations,
  `proxy.ts`, `instrumentation.ts`, sentry config.
- Do NOT change `next.config.ts` unless adding a new image domain
  (you shouldn't need to).
- Do NOT introduce new external dependencies. Everything in V2 is
  achievable with what's in `package.json` today (Tailwind, lucide-react,
  Geist, next-intl, next-themes).
- Do NOT regress Lighthouse. Run `npx lighthouse` on `/en` and `/ru` at
  the end. If TBT or LCP drops, reduce the change scope and re-measure.
  Current prod baseline per `CLAUDE.md`: EN 73 / RU 70.

## Quality gates before opening PR

```
pnpm lint         # must pass clean
pnpm typecheck    # must pass clean
pnpm build        # must pass clean
pnpm test         # all existing Vitest passing
pnpm exec playwright test    # all existing Playwright passing
```

If any test breaks because of a copy change in messages, update the
test fixture in the same commit — don't skip.

## Visual proof required in PR description

Capture and attach:

- `docs/ui-review/v2-current/prod-1920-en.png`
- `docs/ui-review/v2-current/prod-1920-ru.png`
- `docs/ui-review/v2-current/prod-1280-en.png`
- `docs/ui-review/v2-current/prod-1280-ru.png`
- `docs/ui-review/v2-current/prod-768-en.png`
- `docs/ui-review/v2-current/prod-768-ru.png`
- `docs/ui-review/v2-current/prod-414-en.png`
- `docs/ui-review/v2-current/prod-414-ru.png`
- `docs/ui-review/v2-current/prod-390-en.png`
- `docs/ui-review/v2-current/prod-390-ru.png`
- `docs/ui-review/v2-current/header-en-1920.png`
- `docs/ui-review/v2-current/header-ru-1920.png`
- `docs/ui-review/v2-current/favicon-16-zoom.png`
- `docs/ui-review/v2-current/cookie-banner-{1920,768,390}.png`

Use the existing Playwright capture script under `scripts/` if one
exists; otherwise add a single `scripts/capture-v2.ts` and reuse the
same pattern as the prod-current capture.

## Acceptance gates from designer

Listed in `docs/DESIGN_REVIEW_V2.md` §10. Hard gates 1–9 are blockers.
Soft gates 10–14 are nice-to-have — if a soft gate would push merge
past 3 working days, ship without it and surface the deferred items in
PR description.

## Communication

- Owner (Boris) is OUT of the dev loop until visual approve. Don't ping
  him for "should I rename this token" or "is this color OK". Decide
  with the V2 doc as the contract — if V2 is unclear, default to the
  more conservative interpretation (smaller delta vs current state).
- Designer (this file's author) handles post-merge QA via fresh
  screenshots. Single point-fix directive back to dev only if a hard
  gate fails. Not a fresh pass.

## Estimate

2–3 focused days. Hero + cookie banner + how-it-works grouping are the
high-value items — if you have to cut for time, cut from §6/§7/§8 not
from §3/§4.
