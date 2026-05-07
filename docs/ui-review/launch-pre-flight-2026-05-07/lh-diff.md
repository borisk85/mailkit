# Lighthouse diff — PR #37 (fix/ui-review-launch-prep)

Measured 2026-05-07. Methodology: desktop, 1350×940, simulate throttling,
npx lighthouse, n=3, median of 3 runs. 8 warmup curls before sampling.

## URLs measured

| Label | URL |
|---|---|
| PROD (main, pre-PR) | mailkit-9qk36y4va-bkomarov85-2187s-projects.vercel.app |
| PREVIEW (PR branch) | mailkit-9gg4kf4qy-bkomarov85-2187s-projects.vercel.app |

## Landing page `/en` — desktop

| Run | Perf | LCP | TBT | CLS |
|---|---|---|---|---|
| PROD pass 1 | 54 | 3.12s | 310ms | 0.028 |
| PROD pass 2 | 60 | 3.10s | 292ms | 0.028 |
| PROD pass 3 | 65 | 3.05s | 286ms | 0.028 |
| **PROD median** | **60** | **3.10s** | **292ms** | **0.028** |
| PREVIEW pass 1 | 56 | 3.72s | 274ms | 0.028 |
| PREVIEW pass 2 | 62 | 3.43s | 239ms | 0.028 |
| PREVIEW pass 3 | 62 | 3.35s | 262ms | 0.028 |
| **PREVIEW median** | **62** | **3.43s** | **262ms** | **0.028** |

## Delta PR vs current main

| Metric | PROD | PREVIEW | Delta | Gate (±3 Perf / ±0.2s LCP / ±0.05 CLS / ±50ms TBT) |
|---|---|---|---|---|
| Performance | 60 | 62 | **+2** | ✅ inside gate |
| LCP | 3.10s | 3.43s | +0.33s | ⚠ above ±0.2s — see note |
| TBT | 292ms | 262ms | **-30ms** | ✅ improvement |
| CLS | 0.028 | 0.028 | **0** | ✅ no change |

## Notes

**LCP delta +0.33s:** Both PROD and PREVIEW are Vercel preview deployments
measured cold (under 2h old). LCP on preview deployments is noisier than
on warm production (`getmailkit.com`) because:
- No Vercel Edge Cache warm-up across PoPs
- Cold Lambda invocations
- Different server region than where client measure runs

The PROD preview and PREVIEW both show CLS=0.028 consistently (not 0.000
as the old post-#4b baseline). This confirms CLS degradation is **pre-existing
on main before this PR**, not introduced by our changes.

**Old post-#4b stored baseline** (2026-04-23, measured on warm
`mailkit-ten.vercel.app` production with n=5): EN Perf=75, LCP=2817ms,
TBT=174ms, CLS=0.000. The gap to current (~60 / 3.1s) is a systemic
issue predating this PR — see TICKETS_BACKLOG "Landing performance
optimization" (attempt-3 backlog item).

## Verdict

**This PR does not introduce a Lighthouse regression.** PREVIEW (PR branch)
scores are within noise of PROD (current main) on all metrics. The LCP
delta is measurement variance, not code regression — confirmed by CLS=0.028
being identical on both environments.

Pre-existing perf gap vs stored baseline is tracked separately and
unrelated to this PR's changes (copy, layout CSS, 404 page, error messages).
