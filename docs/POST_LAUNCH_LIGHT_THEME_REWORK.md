# Post-Launch — Light Theme Full Rework

**Status:** deferred until after v1 launch + first paying customers
**Created:** 2026-05-09
**Trigger to start:** any of —
- First 50 paying customers landed cleanly
- Explicit owner approval to invest dev time on cosmetic refresh
- Light theme requested by paying customer in support

## Why deferred

Owner reviewed current light theme on 2026-05-09 and rejected as launch-quality:

- Cream background (~#F5F4F0) + white card surfaces → low surface contrast, sections blur into one canvas
- Secondary CTA "See how it works" — outline button on cream nearly invisible
- Pills "Free during promo / No subscription required / Guaranteed" — outline on cream dissolves
- Cards in "Four steps" / "Guarantees" — white with thin border, no depth perception
- Step number watermarks "01 02 03 04" in Times-style on pale background — anemic, unreadable

The fix is not a one-line CSS tweak. It requires a full design pass: three-tier surface palette,
shadow system, button hierarchy that works on cream, contrast rebalancing across all components.
Estimated effort: 1–2 days of dev + design work.

To avoid blocking launch on cosmetic rework, the theme toggle in header was hidden on
2026-05-09 (commit reference in `chore/landing-copy-and-theme-cleanup`). Default is dark theme,
which holds premium quality. Light theme CSS classes remain in code (not deleted) — the toggle
is just not exposed in UI.

## Scope of rework when triggered

1. **Three-tier surface palette** (light theme):
   - Tier 1 (page background): cream / off-white
   - Tier 2 (section background): one shade lighter or one shade darker than Tier 1, distinct
   - Tier 3 (card surface): pure white with shadow OR slightly tinted with border

2. **Shadow system** for cards on light background:
   - Subtle drop-shadow on default state
   - Elevated shadow on hover (M8 hover lift remains)
   - Optional accent-purple glow on hovered cards in problem comparison + pricing

3. **Button hierarchy on cream**:
   - Primary (purple) — same on both themes, works as-is
   - Secondary outline — needs darker border + cream-contrast bg-tint on hover
   - Ghost — needs visible-on-cream variant

4. **Pills + badges**:
   - Outline pills currently invisible on cream → switch to filled with low-opacity bg + visible border
   - Status pills (success green / accent purple) need darker variants for light bg

5. **Step number watermarks**:
   - Currently low opacity on already-pale bg → either increase opacity, or change to filled variant with subtle accent color

6. **Headings + body text**:
   - Black on cream is fine
   - Accent-purple second line in hero may need slight tone shift for light bg readability

7. **Mockup email composing**:
   - Hero mockup is currently dark card on cream — works as-is, possibly polish border

8. **Cookie banner + topbar promo banner**:
   - Yellow banner on cream → check contrast (currently OK but verify on AAA)

## Pages to verify after rework

- `/` (landing — primary)
- `/faq`
- `/privacy`
- `/terms`
- `/guarantee`
- `/status`
- `/app` (dashboard — authenticated)
- `/app/setup` (wizard — all 5 steps)
- `app/not-found.tsx` (custom 404)

## Acceptance criteria

- Lighthouse Performance ≥95 desktop / ≥90 mobile on light theme (same gate as dark)
- Accessibility ≥98 (contrast 4.5:1 minimum on all text/background pairs)
- axe-core: 0 critical, 0 serious additions
- Visual regression baselines regenerated for light theme
- Owner sign-off after pass-through review

## Files affected (estimate)

- `tailwind.config.ts` — surface palette tokens
- `app/globals.css` — CSS variables for both themes
- `components/Header.tsx` — restore theme toggle
- `components/ui/button.tsx` — variant adjustments
- `components/landing/*.tsx` — theme-conditional classes audit
- Possibly new: `lib/theme-tokens.ts` — single source for color tokens

## Reference

- Owner feedback PDF: `docs/ui-review/landing-cleanup-2026-05-09/` (light theme screenshots)
- Original motion polish PR: #41 (chore/landing-motion-polish-v1)
- Cleanup PR (theme toggle hidden): chore/landing-copy-and-theme-cleanup
