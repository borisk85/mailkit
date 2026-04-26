import * as Sentry from "@sentry/nextjs";

/**
 * Edge runtime Sentry init — covers proxy.ts (the Next.js middleware
 * that handles the mock-preview header rewrite) and any future
 * runtime: 'edge' route handlers. Same prod-only posture as the
 * server config.
 */

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? "development",
    tracesSampleRate: 0,
    enabled: process.env.VERCEL_ENV === "production",
  });
}
