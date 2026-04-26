import * as Sentry from "@sentry/nextjs";

/**
 * Server-side Sentry init. SENTRY_DSN (no NEXT_PUBLIC_ prefix) is
 * server-only — never exposed to the client bundle, never read in the
 * browser. Same sampling posture as the client config: prod-only
 * gating + zero traces / replays for the MVP free tier.
 */

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
    enabled: process.env.VERCEL_ENV === "production",
  });
}
