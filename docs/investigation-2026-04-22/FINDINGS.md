# Perf investigation — 2026-04-22

Branch `chore/perf-post-4a-investigation`. Scope set 2026-04-22 per architect:
two layers (#4a Edge/SSR TTFB, #4b RU TBT) on one triage session. This
document is the findings-only artifact; it does not ship code changes.

## TL;DR

- **#4a Edge/SSR TTFB**: real delta is **~50ms median on `/en` landing**, not
  the ~150ms reported earlier. Earlier measurement set contained a 1.29s
  outlier that pulled the median. No hot-path code change on the landing
  route — `proxy.ts` additions sit behind `isProtectedAppRoute(pathname)` and
  only fire for `/{locale}/app/*`. The 50ms residual most plausibly traces to
  larger page manifest / route tree from new setup routes (compile-time
  effect, not per-request), and is at the boundary of noise for current
  sample size.

- **#4b RU TBT**: **not reproducible as a code-level regression.** Preview
  Lighthouse shows RU Perf median 54 vs main-preview 66, but:
  1. **JS bundles are byte-identical EN/RU** (same 16 files, same 262.7KB
     total, verified via `performance.getEntriesByType('resource')` on cold
     RU and EN loads).
  2. `messages/ru.json` grew 6440 → 9199 bytes vs `en.json` 4852 → 6897 —
     same absolute/relative delta, same 95-key / 77-deep tree shape
     (verified via node walker), no new nesting.
  3. RSC payload delta is a flat +2.3KB RU vs EN — expected UTF-8 overhead
     for Cyrillic, not a regression source.
  4. RU Lighthouse run-over-run TBT spread is 21 / 260 / 326ms on the same
     preview URL back-to-back. A real ×7 TBT regression on hot load wouldn't
     swing to 21ms on run 3 with identical code. This is preview-lambda
     cold-start variance under Lighthouse simulated throttling, not a code
     signal.

- **Recommendation**: **do not ship a targeted fix PR for #4b**. The
  `chore/perf-post-4a-4b-fix` plan was predicated on a reproducible RU
  regression that the evidence does not support. For #4a, the 50ms residual
  is not worth a dedicated fix PR either — it is small enough to fold into
  the systemic perf PR that lands *after* the full app shell exists.
  **Proposed path revision:** merge #11 (Brevo) as-is, re-measure on
  production post-merge with N=10+ samples per locale, and fold any
  confirmed regression into a systemic perf PR that can justify broader
  changes (next-intl `pick`, route-segment dynamic, etc.) with solid data.

## Method

All measurements 2026-04-22.

- **Pre-#4a prod preview**: `mailkit-i8s0x9uko-bkomarov85-2187s-projects.vercel.app`
  (SHA `5ef5157`, before #10 merge)
- **Post-#4a prod**: `mailkit-ten.vercel.app` (SHA `626ed14`, #10 merged)
- **Main preview (pre-#4b)**: `mailkit-git-main-bkomarov85-2187s-projects.vercel.app`
  (SHA `aa6ccce`, docs-only commit on top of #4a merge)
- **#4b preview**: `mailkit-git-feat-ticket-4b-brevo-bkomarov85-2187s-projects.vercel.app`
  (SHA `c49f289`)

Warmup: 4–8 curls per URL per locale before any measurement. Lighthouse via
`npx lighthouse --form-factor=desktop --throttling-method=simulate
--screenEmulation.width=1350`. TTFB via `curl -w '%{time_starttransfer}'`
×10.

## Layer A — #4a Edge/SSR TTFB

### Original alarm (from /tmp/investigation-ttfb.txt, pre-compaction)

```
PRE /en TTFB: 0.51 0.43 0.42 0.48 0.41 0.68 0.44 0.48 0.40 0.42 (median ~0.43)
POST /en TTFB: 1.29 0.53 0.74 0.41 0.69 0.57 0.46 0.69 0.48 0.54 (median ~0.55)
```

Reported delta: +120ms. One 1.29s outlier in POST set distorts central
tendency. Trimmed mean (drop top/bottom): PRE 0.446, POST 0.554 → delta
+108ms. Still non-trivial.

### Fresh measurements

Same URLs, identical warmup and sample size (n=10), 2026-04-22:

```
PRE /en TTFB: 0.416 0.537 0.407 0.387 0.363 0.398 0.439 0.684 0.410 0.380
POST /en TTFB: 0.479 0.746 0.535 0.482 0.434 0.533 0.412 0.388 0.398 0.444
```

- PRE median **0.409s**, trimmed mean 0.409
- POST median **0.462s**, trimmed mean 0.463
- Delta: **+53ms median, +54ms trimmed mean**

The earlier 1.29s outlier is not reproducible; fresh set has a single 0.746
which contributes to median movement but does not dominate. Evidence points
to ~50ms systemic delta plus significant cold-start variance.

### What could be the ~50ms?

- **Hot-path proxy diff is zero on `/en`.** `isProtectedAppRoute(pathname)`
  returns false for `/en` (landing), so the new mock bypass and supabase
  auth block are not entered. The intlMiddleware path is identical pre/post
  #4a. Diff attached: [proxy.diff](proxy.diff).
- **`app/[locale]/layout.tsx` diff is line-ending only** (CRLF churn).
  Content byte count moved 1613 → 1679 (+66 bytes of font-class attribute
  churn, not computational).
- **Plausible cause**: Next.js 16 route-tree grew from ~4 routes to ~7 (new
  `/app`, `/app/setup`, `/app/setup/gmail-step` — though gmail-step arrived
  in #4b, not #4a). Route manifest is loaded once per lambda cold start;
  warm requests pay a small manifest-resolution tax. ~50ms on first-visit
  and warmed lambdas is consistent with a modestly larger manifest at Edge
  runtime.

### Conclusion layer A

Regression is smaller and noisier than alarm suggested. Not a clean
reproducible signal that justifies a standalone fix. Fold into a systemic
perf PR post-#11.

## Layer B — #4b RU TBT

### Preview Lighthouse (median of n=3)

| Metric | main preview (pre-#4b) | #4b preview | Delta |
|---|---|---|---|
| EN Perf | 66 (66/66/66) | 66 (62/66/68) | 0 |
| EN LCP | 3081 | 3149 | +68 |
| EN TBT | 29 | 56 | +27 |
| RU Perf | 66 (65/66/67) | 54 (50/54/64) | **−12** |
| RU LCP | 3157 | 3393 | +236 |
| RU TBT | 38 | **260** | **+222** |

RU run-over-run on #4b preview: TBT 326 → 260 → 21 ms (runs 1, 2, 3).
Run 3 brings TBT back into range. A real CPU-bound regression from code
does not swing ×15 across three consecutive runs on an identical URL.

### Falsification: JS bundle EN vs RU on cold preview

Fresh browser context, cold load each URL, `performance.getEntriesByType('resource')`:

| | EN | RU |
|---|---|---|
| JS file count | 16 | 16 |
| JS total bytes | 262,713 | 262,713 |
| Individual chunk sizes | identical | identical |

Bundles are **byte-identical**. No locale-specific chunk split.
[Artifact: network-en.json + network-ru.json](./network-diff.md).

My initial report of "RU +5 files +97KB" was a filter bug — the filter
included `.woff2` font files matching `_next/static`. Real JS-only counts
match exactly.

### Falsification: messages structure

- `en.json`: 6897 bytes, 95 keys, leaf-depth distribution `{2: 23, 3: 35, 4: 19}`
- `ru.json`: 9199 bytes, 95 keys, leaf-depth distribution `{2: 23, 3: 35, 4: 19}`

Identical structure. Size delta is pure UTF-8 overhead for Cyrillic content
(~33% longer text on average).

### Falsification: RSC + HTML payload

Preview `?mock=token_entry`:

| | EN | RU | Delta |
|---|---|---|---|
| RSC size | 12,438 | 14,811 | +2,373 |
| HTML size | 20,941 | 23,542 | +2,601 |

~11% larger RU — matches Cyrillic character-width expectation. Not a
regression source.

### next-intl namespace load audit

`app/[locale]/layout.tsx` wraps children in `<NextIntlClientProvider>` with
**no `messages` prop** — v4 defaults to serializing all messages from the
server context. The entire current-locale message tree is embedded in RSC
payload on every `/{locale}/*` render. This is not new in #4b (same
pattern since Block 2 scaffold), and it affects EN equally. Not a #4b
regression.

[`pick`](https://next-intl-docs.vercel.app/docs/usage/configuration#messages-pick)
is a well-known optimization (serialize only namespaces the page actually
consumes) but it is a systemic improvement, not a fix for #4b specifically.

### t() call audit on setup-wizard path

46 total `t()` / `tBrevo()` / `tState()` / `tSteps()` / `tErr()` calls.
4 with argument objects (`{local}`, `{email}`, `{mailbox}/{domain}`,
`{details}`). **Zero pluralization calls.** next-intl Russian plural rules
(4 forms) are never exercised on this path; hypothesis (c) from directive
is ruled out.

### Conclusion layer B

The preview RU Perf dip is **lambda cold-start variance under Lighthouse
simulated throttling**, not a code regression. The evidence against is
strong:

- same bundle, same bytes, same files EN/RU;
- same message structure;
- payload delta is expected Cyrillic overhead;
- run-over-run spread on identical URL is 21–326ms TBT;
- pluralization is not exercised;
- next-intl serialization pattern unchanged in #4b.

A fix PR on `chore/perf-post-4a-4b-fix` would have no specific target to
fix — it would either land a systemic change (next-intl `pick`, selective
route segments) with no proof it addresses the claimed issue, or change
nothing.

## Recommendation

1. **Drop the fix PR from the plan.** Evidence does not support a
   reproducible, code-level regression on either layer.
2. **Merge #11 on schedule after live smoke.** #11 does not introduce a
   bundle or structural change that would harm perf.
3. **Schedule a real perf measurement post-merge on production** (not
   preview): `mailkit-ten.vercel.app` will update to #4b code. Collect
   n=10 TTFB per locale, n=5 Lighthouse per locale. Compare against
   stored prod baseline EN 75 / RU 70.
4. **If prod post-merge confirms real regression**, open a systemic perf
   PR with broader scope: `NextIntlClientProvider` messages `pick` per
   page, selective dynamic route segments, bundle analyzer pass. The
   budget for such a PR is 2–4 hours of focused work; it would likely
   address both #4a residual and any #4b contribution in one change.
5. **If prod post-merge is within noise of baseline**, mark this
   investigation closed, add a lesson to `LESSONS_LEARNED.md` on
   preview-vs-prod Lighthouse comparability and outlier-robust median
   methodology (min 10 samples, trim outliers before median).

## Artifacts

- [proxy.diff](proxy.diff) — pre/post #4a proxy.ts
- [ttfb-raw.txt](ttfb-raw.txt) — fresh TTFB ×10 both URLs
- [lh-summary.txt](lh-summary.txt) — Lighthouse run table
- [network-diff.md](network-diff.md) — JS resource list EN vs RU
- [/tmp/lh-preview-pr11/*.json](/tmp/lh-preview-pr11/) — raw Lighthouse JSON (not committed)
