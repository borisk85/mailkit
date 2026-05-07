/**
 * Launch-pre-flight UI snapshot script.
 * Run: node scripts/take-ui-snapshots.mjs
 * Requires: pnpm dev (or pnpm start) running on localhost:3000
 */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const BASE = "http://localhost:3000";
const OUT = path.resolve("docs/ui-review/launch-pre-flight-2026-05-07");
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "1280", width: 1280, height: 800 },
  { name: "768", width: 768, height: 1024 },
  { name: "414", width: 414, height: 896 },
  { name: "390", width: 390, height: 844 },
  { name: "360", width: 360, height: 640 },
];

const MOCK_STATES = [
  "smtp_dkim_polling",
  "smtp_dkim_polling_long",
  "gmail_instructions_shown",
  "gmail_done",
  "done",
  "failed",
];

async function shot(page, name) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  // Freeze animations
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; animation-duration: 0s !important; }",
  });
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("✓", name);
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: "light",
    });
    const page = await ctx.newPage();

    // Landing page
    await page.goto(BASE + "/en");
    await shot(page, `landing-${vp.name}`);

    // Landing with cookie banner (clear storage to force show)
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + "/en");
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    await page.waitForTimeout(600);
    await shot(page, `landing-cookie-${vp.name}`);

    // FAQ
    await page.goto(BASE + "/en/faq");
    await shot(page, `faq-${vp.name}`);

    // Privacy
    await page.goto(BASE + "/en/privacy");
    await shot(page, `privacy-${vp.name}`);

    // Terms
    await page.goto(BASE + "/en/terms");
    await shot(page, `terms-${vp.name}`);

    // Guarantee
    await page.goto(BASE + "/en/guarantee");
    await shot(page, `guarantee-${vp.name}`);

    // Status
    await page.goto(BASE + "/en/status");
    await shot(page, `status-${vp.name}`);

    // /app without session (should show auth page)
    await page.goto(BASE + "/en/app");
    await shot(page, `app-signin-${vp.name}`);

    // Setup wizard mocks
    for (const mockState of MOCK_STATES) {
      const suffix = mockState === "smtp_dkim_polling_long" ? "polling-long" :
                     mockState === "smtp_dkim_polling" ? "polling" :
                     mockState === "gmail_instructions_shown" ? "gmail" :
                     mockState === "gmail_done" ? "gmail-done" :
                     mockState === "failed" ? "failed" : "cf-done";
      await page.goto(`${BASE}/en/app/setup?mock=${mockState}`);
      await shot(page, `setup-${suffix}-${vp.name}`);
    }

    // Cookie banner — use CDP scroll dispatch for reliable event firing
    await page.goto(BASE + "/en");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => {
      window.scrollTo(0, window.innerHeight * 2);
      window.dispatchEvent(new Event("scroll"));
    });
    await page.waitForTimeout(800);
    await shot(page, `landing-cookie2-${vp.name}`);

    // /ru/* should 404
    if (vp.name === "1920") {
      await page.goto(BASE + "/ru/privacy");
      await shot(page, `ru-redirect-${vp.name}`);
    }

    await ctx.close();
  }

  // Extra states only on 1920 and 390
  for (const vp of VIEWPORTS.filter((v) => v.name === "1920" || v.name === "390")) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      colorScheme: "light",
    });
    const page = await ctx.newPage();

    // Announcement banner (should be on landing)
    await page.goto(BASE + "/en");
    await shot(page, `landing-banner-${vp.name}`);

    // Footer close-up
    await page.goto(BASE + "/en");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    await shot(page, `footer-${vp.name}`);

    await ctx.close();
  }

  await browser.close();
  console.log("\nAll snapshots saved to", OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
