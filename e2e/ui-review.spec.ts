import { expect, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * UI-review snapshot generator. Drops PNGs into docs/ui-review/
 * organized by section / state / locale / viewport so the architect
 * can scrub the design + copy in the GitHub PR view file-by-file.
 *
 * Not a test in the regression sense — there are no assertions on
 * pixel diffs. It's a test only because Playwright's runner gives
 * us viewport switching + automatic webServer + screenshot tooling
 * for free. Failures here would be navigation timeouts, not
 * design regressions.
 *
 * Coverage matrix (per architect 2026-04-28):
 *   - 5 viewports: desktop-1920, tablet-1024 (landscape), tablet-768
 *     (portrait), mobile-414, mobile-375
 *   - 2 locales: en, ru
 *   - Sections:
 *       landing, app-dashboard (active fixture), terms, privacy,
 *       guarantee
 *       setup-wizard × 4 steps, gmail-wizard × 4 steps
 *       edge-states × 5 scenarios
 *
 * Total: ~180 PNGs, each ≤ 500 KB after a follow-up sharp pass
 * (scripts/optimize-snapshots.mjs).
 */

type Viewport = { name: string; width: number; height: number };

const VIEWPORTS: Viewport[] = [
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "mobile-375", width: 375, height: 812 },
];

const LOCALES = ["en", "ru"] as const;

// Anchor relative to this spec file, not process.cwd() — playwright's
// webServer.cwd in playwright.config.ts is "..", which would otherwise
// land snapshots one level above the repo root.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "docs", "ui-review");

/**
 * Snap a single page at all 5 viewports for the given locale into
 * `<root>/<locale>/<viewport>.png`. Used for sections that don't
 * vary across "steps" or "states" (landing, dashboard active,
 * terms, privacy, guarantee).
 */
async function snapAllViewports(args: {
  page: import("@playwright/test").Page;
  url: string;
  outDir: string;
  beforeShot?: () => Promise<void>;
}) {
  for (const vp of VIEWPORTS) {
    await args.page.setViewportSize({ width: vp.width, height: vp.height });
    await args.page.goto(args.url, { waitUntil: "networkidle" });
    if (args.beforeShot) await args.beforeShot();
    // Small settle wait — webfonts + intersection-observer animations.
    await args.page.waitForTimeout(400);
    await args.page.screenshot({
      path: path.join(args.outDir, `${vp.name}.png`),
      fullPage: true,
      animations: "disabled",
    });
  }
}

test.describe("UI review snapshots", () => {
  test("landing", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}`,
        outDir: path.join(ROOT, "landing", locale),
      });
    }
  });

  test("app-dashboard (active fixture)", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/app?mock=active`,
        outDir: path.join(ROOT, "app-dashboard", locale),
      });
    }
  });

  test("terms", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/terms`,
        outDir: path.join(ROOT, "terms", locale),
      });
    }
  });

  test("privacy", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/privacy`,
        outDir: path.join(ROOT, "privacy", locale),
      });
    }
  });

  test("guarantee", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/guarantee`,
        outDir: path.join(ROOT, "guarantee", locale),
      });
    }
  });

  test("setup-wizard steps", async ({ page }) => {
    test.slow();
    const steps = [
      { id: "step-1", mock: "token_entry" },
      { id: "step-2", mock: "zone_selection" },
      { id: "step-3", mock: "brevo_dns_written" },
      { id: "step-4", mock: "brevo_done" },
    ];
    for (const step of steps) {
      for (const locale of LOCALES) {
        await snapAllViewports({
          page,
          url: `/${locale}/app/setup?mock=${step.mock}`,
          outDir: path.join(ROOT, "setup-wizard", step.id, locale),
        });
      }
    }
  });

  test("gmail-wizard steps", async ({ page }) => {
    test.slow();
    const steps = [
      { id: "step-1", mock: "gmail_instructions_shown" },
      { id: "step-2", mock: "gmail_smtp_ready" },
      { id: "step-3", mock: "gmail_send_as_verified" },
      { id: "step-4", mock: "gmail_done" },
    ];
    for (const step of steps) {
      for (const locale of LOCALES) {
        await snapAllViewports({
          page,
          url: `/${locale}/app/setup?mock=${step.mock}`,
          outDir: path.join(ROOT, "gmail-wizard", step.id, locale),
        });
      }
    }
  });

  test("edge: empty dashboard", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/app?mock=empty`,
        outDir: path.join(ROOT, "edge-states", "empty-dashboard", locale),
      });
    }
  });

  test("edge: failed setup", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/app/setup?mock=failed`,
        outDir: path.join(ROOT, "edge-states", "failed-setup", locale),
      });
    }
  });

  test("edge: awaiting verify (CF)", async ({ page }) => {
    test.slow();
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/app/setup?mock=awaiting_verify`,
        outDir: path.join(ROOT, "edge-states", "awaiting-verify-cf", locale),
      });
    }
  });

  test("edge: cookie consent visible", async ({ page, context }) => {
    test.slow();
    for (const locale of LOCALES) {
      // localStorage cleared per page.goto so the banner re-appears
      // each time. The base URL gives us a same-origin storage clear.
      await page.goto(`/${locale}`);
      await context.clearCookies();
      await page.evaluate(() => localStorage.clear());
      await snapAllViewports({
        page,
        url: `/${locale}`,
        outDir: path.join(ROOT, "edge-states", "cookie-consent", locale),
      });
    }
  });

  test("edge: error boundary", async ({ page }) => {
    test.slow();
    // Trigger Next.js error boundary by hitting a route that throws.
    // We don't have a built-in throw route, so we reach the
    // boundary by passing an invalid mock state which the
    // setup-wizard reads safely → there's no synthetic throw available
    // without code changes. Snap the dashboard's empty fixture as a
    // proxy for the error fallback layout, captioned via filename.
    //
    // Better approach when we can land it: a `?throw=1` dev-only
    // search param that throws inside a server component to render
    // app/[locale]/error.tsx. For now, this snapshot is a stand-in;
    // the architect can request the synthetic-throw route as a
    // follow-up if needed.
    for (const locale of LOCALES) {
      await snapAllViewports({
        page,
        url: `/${locale}/app?mock=empty`,
        outDir: path.join(ROOT, "edge-states", "error-boundary-PROXY", locale),
      });
    }
  });
});

// Quiet the unused import for environments that don't need it at type level.
void expect;
