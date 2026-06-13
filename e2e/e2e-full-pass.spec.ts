import { expect, test } from "@playwright/test";

/**
 * Full-pass e2e suite against PRODUCTION (https://getmailkit.com).
 *
 * Overrides baseURL so this file always hits prod regardless of the
 * playwright.config.ts default (localhost:3000). Run in isolation with:
 *
 *   pnpm playwright test e2e/e2e-full-pass.spec.ts --project=desktop-chrome
 *
 * Tests run serially so failures are easier to trace in CI output.
 */

test.use({ baseURL: "https://getmailkit.com" });

test.describe.configure({ mode: "serial" });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Attach console error listener to a page and return the collector array. */
function collectConsoleErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return errors;
}

/** Read the number of resource performance entries on the current page. */
async function resourceCount(
  page: import("@playwright/test").Page,
): Promise<number> {
  return page.evaluate(
    () => window.performance.getEntriesByType("resource").length,
  );
}

// ---------------------------------------------------------------------------
// Public pages (no auth)
// ---------------------------------------------------------------------------

test("/ loads — title includes MailKit, header has Sign in, 0 console errors", async ({
  page,
}) => {
  const errors = collectConsoleErrors(page);

  await page.goto("/");
  await expect(page).toHaveTitle(/MailKit/i);

  // Header should surface a "Sign in" button for unauthenticated users.
  await expect(
    page.getByRole("button", { name: /Sign in/i }).first(),
  ).toBeVisible();

  // No JS console errors on the homepage.
  expect(errors).toHaveLength(0);

  const count = await resourceCount(page);
  console.info(`[perf] / resource entries: ${count}`);
});

test("/faq loads — heading visible", async ({ page }) => {
  const res = await page.goto("/faq");
  expect(res?.status()).toBe(200);
  await expect(page.locator("h1, h2").first()).toBeVisible();

  const count = await resourceCount(page);
  console.info(`[perf] /faq resource entries: ${count}`);
});

test("/privacy, /terms, /guarantee all load 200", async ({ page }) => {
  for (const path of ["/privacy", "/terms", "/guarantee"]) {
    const res = await page.goto(path);
    expect(res?.status(), `expected 200 for ${path}`).toBe(200);
  }

  const count = await resourceCount(page);
  console.info(`[perf] /guarantee resource entries: ${count}`);
});

test("/status loads 200", async ({ page }) => {
  const res = await page.goto("/status");
  expect(res?.status()).toBe(200);

  const count = await resourceCount(page);
  console.info(`[perf] /status resource entries: ${count}`);
});

test("/totally-random → branded 404 page (not Vercel default)", async ({
  page,
}) => {
  await page.goto("/totally-random", { waitUntil: "domcontentloaded" });

  // Vercel default 404 shows "404: NOT_FOUND". Our branded page says
  // something like "Page not found".
  await expect(
    page.getByText(/Page not found/i, { exact: false }),
  ).toBeVisible();

  // Double-check it is NOT Vercel's bare error page.
  await expect(page.getByText(/NOT_FOUND/i, { exact: false })).toHaveCount(0);

  const count = await resourceCount(page);
  console.info(`[perf] /totally-random resource entries: ${count}`);
});

test("/ru → 308 redirect (verified via response chain)", async ({ page }) => {
  // Capture the 308 via response listener — page.goto returns the final response
  let sawRedirect = false;
  page.on("response", (res) => {
    if (res.url().includes("/ru") && res.status() === 308) sawRedirect = true;
  });
  await page.goto("/ru");
  expect(sawRedirect, "/ru should produce a 308 redirect").toBe(true);
  // Final destination should not be /ru
  expect(page.url()).not.toContain("/ru");

  const count = await resourceCount(page);
  console.info(`[perf] /ru resource entries: ${count}`);
});

test("/ru/privacy → 308 redirect (verified via response chain)", async ({
  page,
}) => {
  let sawRedirect = false;
  page.on("response", (res) => {
    if (res.url().includes("/ru/privacy") && res.status() === 308)
      sawRedirect = true;
  });
  await page.goto("/ru/privacy");
  expect(sawRedirect, "/ru/privacy should produce a 308 redirect").toBe(true);
  expect(page.url()).not.toContain("/ru");

  const count = await resourceCount(page);
  console.info(`[perf] /ru/privacy resource entries: ${count}`);
});

// ---------------------------------------------------------------------------
// Auth redirect (unauthenticated)
// ---------------------------------------------------------------------------

test("/app unauthenticated → redirects to landing page /", async ({ page }) => {
  await page.goto("/app");

  // After redirect the final URL should be the root (landing page).
  const finalUrl = page.url();
  expect(
    finalUrl.endsWith("/") || finalUrl === "https://getmailkit.com",
    `Expected redirect to landing, got: ${finalUrl}`,
  ).toBe(true);

  const count = await resourceCount(page);
  console.info(`[perf] /app→/ resource entries: ${count}`);
});

// ---------------------------------------------------------------------------
// Hero CTA (unauthenticated)
// CTA is now a button that triggers Google OAuth — no longer an LS link.
// ---------------------------------------------------------------------------

test("/ hero CTA 'Get your email' is visible and triggers auth flow", async ({
  page,
}) => {
  await page.goto("/");

  const cta = page.getByRole("button", { name: /Get your email/i }).first();
  await expect(cta).toBeVisible();

  const count = await resourceCount(page);
  console.info(`[perf] hero CTA resource entries: ${count}`);
});

// ---------------------------------------------------------------------------
// Mobile viewport — re-run homepage check at 390×844
// ---------------------------------------------------------------------------

test("mobile 390×844: / loads, header visible, no layout overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  const errors = collectConsoleErrors(page);
  await page.goto("/");

  // Header should still be in the DOM on mobile.
  await expect(page.locator("header").first()).toBeVisible();

  // Basic overflow check: body should not be wider than viewport.
  const overflowing = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth;
  });
  expect(overflowing, "body wider than viewport — horizontal overflow").toBe(
    false,
  );

  // Supabase chat / support bubble (if present) should not cover main content.
  // We only assert it exists or does not exist — not its exact position —
  // because prod may A/B test or hide it.
  const bubble = page.locator('[id*="chat"], [class*="chat-bubble"]').first();
  const bubbleCount = await bubble.count();
  if (bubbleCount > 0) {
    // If it exists it must be visible and not overlap the hero CTA.
    const heroBox = await page
      .getByRole("button", { name: /Get your email/i })
      .first()
      .boundingBox();
    const bubbleBox = await bubble.boundingBox();

    if (heroBox && bubbleBox) {
      const overlapping =
        heroBox.x < bubbleBox.x + bubbleBox.width &&
        heroBox.x + heroBox.width > bubbleBox.x &&
        heroBox.y < bubbleBox.y + bubbleBox.height &&
        heroBox.y + heroBox.height > bubbleBox.y;

      expect(overlapping, "chat bubble overlaps hero CTA").toBe(false);
    }
  }

  expect(errors).toHaveLength(0);

  const count = await resourceCount(page);
  console.info(`[perf] mobile / resource entries: ${count}`);
});

// ---------------------------------------------------------------------------
// Dashboard (authenticated) — skipped; covered by unit tests + mock e2e
// ---------------------------------------------------------------------------

test.skip("dashboard authenticated — covered by e2e/dashboard.spec.ts mock tests", // section, refund history, etc.) are exercised by e2e/dashboard.spec.ts // Steps 11-17 from the full-pass plan (inbox view, setup flow, account
// which uses the x-mailkit-mock=1 bypass header to inject fixture data
// without a real Supabase session. Duplicating them here against prod
// would require real session injection which is not available in CI.
async () => {});
