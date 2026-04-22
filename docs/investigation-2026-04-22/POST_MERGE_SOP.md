# Post-#11 merge — prod re-measure SOP

Run this SOP in the 60-minute window after PR #11 merges to `main` (which
promotes to `mailkit-ten.vercel.app` via Vercel auto-deploy). Goal: confirm
whether the #4b merge moves prod perf against the stored baseline, and
close this investigation one way or the other.

## Pre-flight

1. Verify prod deployment SHA matches `main` HEAD:
   ```
   curl -s https://mailkit-ten.vercel.app/api/health 2>/dev/null || \
     vercel inspect https://mailkit-ten.vercel.app | grep -iE "commit|deployment"
   ```
2. Wait ≥60 minutes after the deploy completes. This lets:
   - Vercel edge cache warm for IAD region
   - Lambda pool stabilize into warm-hot state
   - Any CI-triggered background requests settle

## TTFB sampling (n=10, trim min+max, median)

```bash
for url in "/en" "/ru" "/en/app/setup?mock=token_entry" "/ru/app/setup?mock=token_entry"; do
  # 4 warmups (not recorded)
  for i in 1 2 3 4; do curl -s -o /dev/null "https://mailkit-ten.vercel.app$url"; done
  echo "=== $url ==="
  for i in 1 2 3 4 5 6 7 8 9 10; do
    curl -s -o /dev/null -w "%{time_starttransfer}\n" "https://mailkit-ten.vercel.app$url"
  done
done
```

Record raw output in `docs/investigation-2026-04-22/post-merge-ttfb.txt`
with sorted lines. Compute median *and* trimmed mean (drop min + max).

## Lighthouse sampling (n=5 median per locale)

Warm edge (8 curls per URL first), then:

```bash
for locale in en ru; do
  for page in "" "/app/setup?mock=token_entry"; do
    for i in 1 2 3 4 5; do
      CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe" \
        npx --yes lighthouse \
        "https://mailkit-ten.vercel.app/$locale$page" \
        --only-categories=performance \
        --form-factor=desktop \
        --screenEmulation.mobile=false \
        --screenEmulation.width=1350 \
        --screenEmulation.height=940 \
        --screenEmulation.deviceScaleFactor=1 \
        --throttling-method=simulate \
        --output=json \
        --output-path="/tmp/lh-prod-post-4b/${locale}${page//\//_}-${i}.json" \
        --chrome-flags="--headless=new --no-sandbox" \
        --quiet
    done
  done
done
```

## Decision table

| Condition | Action |
|---|---|
| Landing median EN ≥80 **and** RU ≥80 | Investigation closed, noise-only |
| Setup median EN ≥75 **and** RU ≥75 | Investigation closed, noise-only |
| Any page median <80 **and** delta >10 from pre-merge prod measurement | Real regression — open systemic perf PR |
| Any page median <80 **and** delta ≤10 | Soft signal — document in backlog attempt-3, do not block |
| Landing median drops below pre-#4a baseline (EN 87 / RU 87) by ≥12 points on either locale | Confirmed compound regression — prioritize perf PR before any new feature work |

"Delta" is vs the **current** stored prod baseline (post-#4a stable warm:
EN 77 / RU 74 landing). If we have no post-#4b-pre-merge baseline, reuse
post-#4a as the comparison point.

## If systemic perf PR is warranted

Open `chore/perf-systemic-attempt-3` (attempt-3, not attempt-2 — earlier
attempt-2 in backlog was scoped differently, do not confuse). Scope
candidates, in priority order:

1. **`<NextIntlClientProvider messages={pick(messages, [...])}>`** in
   `app/[locale]/layout.tsx`. Pass only namespaces actually used on each
   page. Saves RSC serialization + client hydration cost. Requires
   per-page-segment analysis or a coarse grouping (public vs app).
2. **Dynamic route segment for `/app/*`**: mark `export const dynamic =
   "force-dynamic"` so `/app/*` does not pay static generation cost.
   Offset by not paying page-manifest-lookup tax for auth-gated routes.
3. **Bundle analyzer pass**: `@next/bundle-analyzer` wired via
   `next.config.ts`. Identify any library that crept >20KB and is not
   essential (e.g. shadcn icons, date libs).
4. **Font strategy review**: currently `Geist` + `Geist_Mono` both with
   `preload: true`, subsets `["latin"]`. Cyrillic content may render with
   fallback fonts causing FOIT/FOUT on RU. Confirm via DevTools font load.

Do **not** bundle these with a feature PR — attempt-3 is its own PR with
measurement-driven justification for each change.

## Close-out

When investigation is closed (either path):

1. Update `docs/TICKETS_BACKLOG.md` — remove the in-flight investigation
   entry, add lesson learned if applicable.
2. Add an entry to `docs/LESSONS_LEARNED.md`:
   - Preview LH cold-start variance, methodology caveat
   - Outlier-sensitive median (10+ samples + trim)
   - Filter bugs in `performance.getEntriesByType` (my .woff2 filter bug
     as a concrete example)
3. Archive raw LH JSON + TTFB raw to
   `docs/investigation-2026-04-22/post-merge-artifacts/` (gitignored in
   full; commit only summary `.txt`).
