import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init. The init runs only when SENTRY_DSN is
 * present in the bundle (Next.js inlines NEXT_PUBLIC_* at build), so
 * absent-DSN dev environments don't ship a no-op SDK call into every
 * page load.
 *
 * Sample rates are conservative for the MVP free tier (5K errors /
 * month). Performance sampling is off — we'll turn it on after launch
 * if real-user latency data starts mattering. Replay is also off
 * pre-launch; replay events are 5-10× the byte cost of error events
 * and we don't have the budget headroom yet.
 */

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Bail out of dev / preview noise — only prod errors burn the
    // free-tier quota.
    enabled: process.env.NEXT_PUBLIC_VERCEL_ENV === "production",
  });
}
