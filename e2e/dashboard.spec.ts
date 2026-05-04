import { expect, test } from "@playwright/test";

/**
 * Dashboard structural / a11y checks against the four mock fixtures.
 *
 * No image snapshot baselines yet — we don't want a flaky pixel diff
 * to block a CSS tweak. Instead each test asserts the structural
 * contract:
 *   - the right sections render for the fixture
 *   - the destructive button + confirm modal are both reachable
 *   - the user-visible copy matches the i18n payload at the locale
 *
 * Both viewports (desktop-chrome 1280×800 and mobile-iphone) run
 * every spec via Playwright's `projects` setup in playwright.config.ts.
 *
 * The tests rely on the layout's mock-preview header bypass
 * (proxy.ts → x-mailkit-mock=1). Production hard-disables it.
 */

test.describe("Dashboard EN", () => {
  test("empty fixture: greeting + emptyState CTA + Account/Resources", async ({
    page,
  }) => {
    await page.goto("/en/app?mock=empty");
    await expect(
      page.getByRole("heading", { level: 1, name: /Welcome back/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Set up your first domain/ }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Start setup/ })).toBeVisible();
    // Setup/Purchases/Refunds sections hidden when empty
    await expect(
      page.getByRole("heading", { level: 2, name: /Domain setups/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { level: 2, name: /Purchases/ }),
    ).toHaveCount(0);
    // Account + Resources always visible
    await expect(
      page.getByRole("heading", { level: 2, name: /^Account$/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /^Resources$/ }),
    ).toBeVisible();
  });

  test("active fixture: setup card + paid purchase, no refunds section", async ({
    page,
  }) => {
    await page.goto("/en/app?mock=active");
    await expect(
      page.getByRole("heading", { level: 2, name: /Domain setups/ }),
    ).toBeVisible();
    await expect(page.getByText(/hello@founders\.example/)).toBeVisible();
    // Active = brevo_dns_written → "Awaiting your action" badge.
    await expect(page.getByText(/Awaiting your action/).first()).toBeVisible();
    // Continue button (not Re-setup, not Open).
    await expect(
      page.getByRole("link", { name: /Continue setup/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Purchases/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Refund history/ }),
    ).toHaveCount(0);
  });

  test("done fixture: 'Setup complete' badge + Open button", async ({
    page,
  }) => {
    await page.goto("/en/app?mock=done");
    await expect(page.getByText(/Setup complete/).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /^Open$/ }).first(),
    ).toBeVisible();
  });

  test("failed fixture: error message + Re-setup CTA + refunds section", async ({
    page,
  }) => {
    await page.goto("/en/app?mock=failed");
    await expect(page.getByText(/Failed/).first()).toBeVisible();
    await expect(page.getByText(/SMTP verification timed out/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Re-setup this domain/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /Refund history/ }),
    ).toBeVisible();
    // Both desktop table + mobile card render in the DOM at once
    // via the hidden/sm:block split — filter to the visible one so
    // the assertion is stable across viewports. The "Auto"
    // triggeredBy label only stands alone on desktop (it's inlined
    // into the card paragraph on mobile), so we verify it through
    // the broader "Automation failure" copy that appears in both.
    await expect(
      page
        .getByText(/Automation failure/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });

  test("delete-account modal: Cancel keeps user on dashboard", async ({
    page,
  }) => {
    await page.goto("/en/app?mock=empty");
    await page.getByRole("button", { name: /Delete my account/ }).click();
    await expect(
      page.getByRole("heading", { name: /Delete your MailKit account\?/ }),
    ).toBeVisible();
    await page.getByRole("button", { name: /^Cancel$/ }).click();
    await expect(
      page.getByRole("heading", { name: /Delete your MailKit account\?/ }),
    ).toHaveCount(0);
    // Still on dashboard.
    await expect(
      page.getByRole("heading", { level: 1, name: /Welcome back/ }),
    ).toBeVisible();
  });
});

test.describe("Dashboard RU", () => {
  test("empty fixture: RU greeting + RU empty state copy", async ({ page }) => {
    await page.goto("/ru/app?mock=empty");
    await expect(
      page.getByRole("heading", { level: 1, name: /С возвращением/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 2,
        name: /Настрой свой первый домен/,
      }),
    ).toBeVisible();
  });

  test("failed fixture: RU 'Не удалось' + 'Перенастроить домен'", async ({
    page,
  }) => {
    await page.goto("/ru/app?mock=failed");
    await expect(page.getByText(/Не удалось/).first()).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Перенастроить домен/ }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: /История возвратов/ }),
    ).toBeVisible();
  });
});
