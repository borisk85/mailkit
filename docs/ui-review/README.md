# UI Review Snapshots

Architect-facing reference set for line-by-line design + copy review.
180 PNGs covering every public surface and every edge state on five
viewports × two locales.

## Structure

```
ui-review/
  landing/{en,ru}/{desktop-1920,tablet-1024,tablet-768,mobile-414,mobile-375}.png
  app-dashboard/{en,ru}/<5 viewport>     ← active fixture (setup + paid purchase)
  terms/{en,ru}/<5 viewport>
  privacy/{en,ru}/<5 viewport>
  guarantee/{en,ru}/<5 viewport>
  setup-wizard/step-{1..4}/{en,ru}/<5 viewport>
  gmail-wizard/step-{1..4}/{en,ru}/<5 viewport>
  edge-states/
    cookie-consent/{en,ru}/<5 viewport>     ← banner visible (localStorage cleared)
    empty-dashboard/{en,ru}/<5 viewport>    ← brand-new account, zero state
    failed-setup/{en,ru}/<5 viewport>       ← failed mock state
    awaiting-verify-cf/{en,ru}/<5 viewport> ← Cloudflare destination email pending
    error-boundary-PROXY/{en,ru}/<5 viewport>
```

## Viewport map

| Name | Width × Height | Approximates |
|---|---|---|
| desktop-1920 | 1920×1080 | full HD desktop monitor |
| tablet-1024 | 1024×768 | iPad landscape |
| tablet-768 | 768×1024 | iPad portrait |
| mobile-414 | 414×896 | iPhone Plus |
| mobile-375 | 375×812 | iPhone (standard) |

## Wizard step → mock-state map

The wizard's 14 mock states (defined in `app/[locale]/app/setup/page.tsx`)
collapse into 8 review buckets — 4 for the CF/Brevo automation phase and
4 for the Gmail Send-As guided phase:

### setup-wizard/
| Step | mock query | Phase |
|---|---|---|
| step-1 | `?mock=token_entry` | Cloudflare API token paste |
| step-2 | `?mock=zone_selection` | Zone + mailbox local-part picker |
| step-3 | `?mock=brevo_dns_written` | Brevo DNS waiting on propagation |
| step-4 | `?mock=brevo_done` | Brevo terminal — ready to start Gmail |

### gmail-wizard/
| Step | mock query |
|---|---|
| step-1 | `?mock=gmail_instructions_shown` |
| step-2 | `?mock=gmail_smtp_ready` |
| step-3 | `?mock=gmail_send_as_verified` |
| step-4 | `?mock=gmail_done` |

## Known caveats

- **`error-boundary-PROXY/`** is a stand-in. We don't have a synthetic
  throw route in MVP code. The screenshots are the empty-dashboard
  layout as a proxy for the visual frame the boundary would render
  inside. If the architect wants the real error-page layout, we'll
  add a `?throw=1` dev-only param in a follow-up.
- **`emails/`** intentionally not included this round — current
  transactional emails (auto-refund, send-limit-block, deliverability
  suspend, deliverability warn) are plain text without HTML
  rendering. Welcome + receipt emails are deferred (#47, post-launch).
  When HTML templates ship, that folder gets populated separately.
- **Cookie consent on landing** — the consent banner persists in
  `localStorage` after dismissal, so each shot under `cookie-consent/`
  was captured after a `localStorage.clear()` to force re-render. On
  other sections the banner may or may not appear depending on the
  default consent state of the rendering session.

## Regenerate

```bash
pnpm exec playwright test --config=e2e/playwright.config.ts \
  --project=desktop-chrome e2e/ui-review.spec.ts
node scripts/optimize-snapshots.mjs
```

The Playwright spec brings up `pnpm dev` itself via `webServer:`.
Total runtime ~5 minutes.

## Sizes

- Each PNG ≤ 500 KB (architect requirement)
- Whole `ui-review/` folder ~13 MB checked into the repo

PNGs are committed as part of the design-review artifact, not as
runtime assets — they live under `docs/` and ship with the repo, but
aren't bundled into the application.
