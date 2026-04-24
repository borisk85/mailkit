# Ticket #6 — post-merge prod re-measure (2026-04-24)

Merge of PR #12 (`feat/ticket-6-gmail-wizard` → main) landed as commit
`3a5fcec` on 2026-04-23 19:15 UTC. Vercel prod deploy `mailkit-e0z1hysdn`
promoted to `mailkit-ten.vercel.app`. Measurement taken ~12h later with
fully warm CDN + lambda pool — well past the 60-min SOP minimum warm
requirement.

Methodology mirrors `docs/investigation-2026-04-22/POST_MERGE_SOP.md`:
8 warmup curls per URL, TTFB n=10 + median + trimmed (drop min+max),
Lighthouse n=5 per locale with desktop + simulate throttling.

## TTFB — n=10 per locale (raw in `ttfb-raw.txt`)

| Locale | Median | Trimmed (drop min+max) | post-#4b baseline | Delta |
|---|---|---|---|---|
| /en | **361ms** | 396ms | 392ms median / 408ms trimmed | **−31ms** / −12ms (improvement) |
| /ru | **384ms** | 403ms | 427ms median / 438ms trimmed | **−43ms** / −35ms (improvement) |

Both locales improved at the Edge/SSR layer. Well within architect's
"no regression >100ms" acceptance.

## Lighthouse — n=5 per locale, desktop + simulate

Raw JSON kept locally at `/tmp/lh-prod-post6/` (not committed — same
SOP as `docs/investigation-2026-04-22/`, commit only summary + ttfb-raw
to avoid repo bloat; per-run values captured in the tables below for
reproducibility).

| Locale | Perf median | Perf range | FCP | LCP | TBT | CLS | Speed Index |
|---|---|---|---|---|---|---|---|
| EN | **73** | 68-77 (Δ9) | 1041ms | 2691ms | 228ms | 0.000 | 1843 |
| RU | **70** | 61-73 (Δ12) | 1135ms | 2888ms | 237ms | 0.001 | 1942 |

### EN raw runs

```
run  perf  fcp   lcp   tbt  cls   si
1    68    1148  2948  240  0.000 2247
2    74    1041  2691  206  0.000 1736
3    70    998   2648  268  0.000 1877
4    77    1008  2658  175  0.000 1843
5    73    1099  2749  228  0.000 1703
```

### RU raw runs

```
run  perf  fcp   lcp   tbt  cls   si
1    73    1092  2742  214  0.001 1869
2    70    1275  2925  207  0.001 2049
3    61    1139  3045  368  0.001 2104
4    70    1036  2813  252  0.001 1942
5    71    1135  2888  237  0.001 1712
```

## Comparison to prior baselines

| Checkpoint | EN Perf | RU Perf | Notes |
|---|---|---|---|
| Post PR #9 (2026-04-21) | 87 | 87 | pre-#4a stable |
| Post PR #10 stable warm (post-#4a) | 77 | 74 | −10 EN / −13 RU from PR #9 — shared-chunk pollution from setup-wizard imports |
| Post PR #11 (post-#4b, 2026-04-23) | 75 | 85 | +11 RU vs post-#4a (noise on RU) |
| **Post PR #12 (this measurement, 2026-04-24)** | **73** | **70** | EN −2 (noise), RU −15 from post-#4b |

## Decision vs architect acceptance

Architect threshold: `LH EN≥70 / RU≥70, TTFB не регрессировал >100ms`.

- EN 73 ≥ 70 ✓
- RU 70 ≥ 70 ✓ (at threshold — RU run 3 dropped to 61 pulling the median; runs 1,2,4,5 are 70-73 cluster)
- TTFB improvement on both locales ✓
- LCP EN 2691ms above <2500 target, RU 2888ms above; TBT both above <200ms — but these are pre-existing failures from post-#4a, not a #6 regression

Regression on RU of 15 points vs post-#4b (85 → 70) is larger than usual
run-over-run noise. But the post-#4b RU=85 measurement was itself +11
above post-#4a RU=74; RU has historically swung widely between prod
measurements. The current 70 is closer to the post-#4a 74 than to the
post-#4b 85, suggesting last round's 85 was a positive outlier and this
round reflects the true mid-range for the RU landing on this code path.

### Per-#6 diff impact hypothesis

PR #12 does not touch landing directly. Changes: new `lib/integrations/brevo-smtp.ts`, actions.ts extension with Gmail step logic, `setup-wizard.tsx` extension with 6-step wizard, migration 0005, `/app/setup/gmail-step` redirect. Pre-merge I verified `rootMainFiles` identical (445.5 KB / 7 files both pre and post etap-2) and polyfillFiles identical (110 KB). Landing bundle is unchanged — route-specific delta is contained to `/app/setup`.

So the RU swing is most likely a measurement-level artifact, not code-induced. Consistent with our own `docs/LESSONS_LEARNED.md` "Preview vs prod Lighthouse" finding that RU is noise-prone on prod too.

## Decision

**Investigation closed, merge verified stable.** Numbers acceptable under architect rubric. Systemic perf attempt-3 remains the right path for pushing both locales back into 80s+ (next-intl `pick`, selective dynamic route segments, bundle analyzer pass). Not a blocker for #7 / #11 start.

## Baseline update for CLAUDE.md

Adding post-#6 row to the "Current stored prod baselines" table:

- Post-#6 stable warm: EN 73 / RU 70 (2026-04-24, n=5 each, 12h post-merge warm)

Next measurement after #11 (landing redesign) per SOP — will compare against this row as the fresh baseline.
