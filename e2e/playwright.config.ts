import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000/en",
    reuseExistingServer: true,
    timeout: 120_000,
    cwd: "..",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      // Pixel 7 is chromium-based — same browser binary as desktop,
      // no separate webkit install needed on the dev box. The actual
      // breakpoint we care about is sm: (< 640px) where the table
      // hides and stacked cards show; Pixel 7's 412px viewport is
      // safely under that.
      name: "mobile-pixel",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
