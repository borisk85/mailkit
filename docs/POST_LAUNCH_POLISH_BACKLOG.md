# Post-Launch Polish Backlog

Motion and structural upgrades queued for after launch + first paying customers.
Deployed in batches of 2–3 items per PR, with Lighthouse gate on each.

**Trigger date:** after launch + first 50–100 paying users.
**Process gate:** Lighthouse ≥95 desktop / ≥90 mobile before and after each PR. Any regression → revert offending item, document.

---

## PR 1 — `chore/landing-motion-polish-v1` (planned, after feat/wizard-ux-rebuild merge)

| Item | Status |
|------|--------|
| S1 — SVG underline under "30 minutes" in hero | **DOING** |
| M5 — Pulsing accent dot in FIRST25 banner | **DOING** |
| M8 — Hover lift on all interactive elements | **DOING** |

---

## PR 2 — after first paying customers

| Item | Notes |
|------|-------|
| M14 — FAQ accordion animation | Use AnimatePresence if Framer Motion already in bundle (check delta first). Otherwise: CSS `grid-template-rows: 0fr → 1fr` trick, zero bundle cost. Benchmark both, pick smaller. |
| M12 — Step numbers fade on scroll-into-view | IntersectionObserver + `opacity/translateY`. Standard pattern, no bundle cost. Replaces M4 (see below). |

---

## Deferred items — do not implement until explicitly scheduled

### Structural additions

- **S2 — Bento grid replacing four-step row**: Mixed-size card layout (1 large + 2 medium + 1 small) to reinforce "we do 3, you do 1". High CLS risk, requires design review separate from code. Deferred because structural rework needs UX validation with real users first.

- **S3 — Stats card after hero**: "30 min / 4 steps / $5 / ∞ addresses" dark surface with large numbers. Good idea, but adds weight above the fold. Deferred until conversion data shows users need more social proof before CTA.

- **S4 — Marquee strip**: "30 MIN ▸ NO HASSLE ▸ DONE ▸" repeating band. **Skipped entirely.** Only 3 logos in our logo strip means marquee looks like a bug (same items repeat visibly). Marquee needs 6–10+ items to feel natural. Revisit if we add DMARC monitoring, analytics partners, etc.

- **S5 — Floating notification "N domains set up this week"**: If static — it's a trust dark pattern. If real — requires analytics API. Deferred until we have real numbers worth showing.

- **S6 — Animated email composing in hero mockup**: Typing animation on To/Subject fields, Send button pulse, 12s loop. Complex Framer Motion state, adds to LCP time if in viewport. Deferred post-launch.

### Constant motion (deferred)

- **M1 — Aurora gradient behind hero**: Radial gradient, 22s translate loop. `filter: blur()` on large area is expensive on mobile. Deferred until mobile Lighthouse is confirmed healthy post-S1/M5/M8.

- **M2 — Live email composing animation**: JS-driven Framer Motion typing loop. Fights with LCP (hero text = LCP element). Deferred.

- **M3 — Marquee animation**: Depends on S4 which is skipped.

- **M4 — Logo strip marquee**: **Skipped.** Only 3 logos (Cloudflare / Postmark / Gmail) — seamless loop reads as a glitch. Replaced in PR2 by M12 (step numbers fade).

- **M6 — Floating notification drift**: Depends on S5 which is deferred.

- **M7 — Gradient sweep on CTA buttons**: `::before` pseudo-element sliding overlay every 5s. Could cause repaint. Evaluate after PR1 settles.

- **M9 — Cursor-tracking glow**: `mousemove` + `requestAnimationFrame` = jank on low-end devices (our SMB audience). Zero conversion evidence. Skipped indefinitely.

- **M10 — Char-by-char hero reveal**: Directly delays LCP. Hero text is the LCP element. **Banned** for performance reasons.

- **M11 — Number count-up on first paint**: JS animation at startup = TBT cost. The "$5" and "4 steps" claims don't need animation to land. Deferred.

- **M13 — Pricing card box-shadow pulse**: `box-shadow` is **paint, not GPU**. Contradicts the GPU-only hard constraint. Do not implement as described. If needed, achieve glow via `filter: drop-shadow()` instead (GPU-composited). Deferred pending design re-spec.

- **M15 — Live counter "+1 every 6 seconds"**: Fake animation = trust issue. Real data requires WebSocket or polling. Deferred until real analytics available.

- **M16 — Guarantee cards hover effect**: Green/violet glow + scale(1.01). Good idea, blocked by M8 needing to ship first. Add in PR2 or PR3.

---

## Implementation notes

### M14 — FAQ accordion decision tree
```
pnpm build → du -sh .next/static/chunks/
Is framer-motion already in main chunk? 
  YES → use AnimatePresence (height auto, 250ms ease-out)
  NO  → use CSS grid-template-rows: 0fr → 1fr with overflow:hidden on child
         (95% of the effect, 0KB added)
```

### M13 — corrected glow approach (when scheduled)
Instead of `box-shadow` (paint):
```css
filter: drop-shadow(0 0 12px rgba(var(--accent-purple-500), 0.3));
```
`filter` is GPU-composited. Measure FPS on mobile before shipping.

### M8 reduced-motion rule (applies immediately in PR1)
```css
@media (prefers-reduced-motion: reduce) {
  /* No transition, but keep hover state visible */
  .hover-lift:hover { border-color: var(--mk-accent); }
}
```

---

---

**Light theme rework** — see [docs/POST_LAUNCH_LIGHT_THEME_REWORK.md](POST_LAUNCH_LIGHT_THEME_REWORK.md) (separate higher-priority track, tracked as #THEME-1).

*Last updated: 2026-05-09. Triggered by motion audit after wizard-ux-rebuild merge.*
