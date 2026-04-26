/**
 * Next.js instrumentation hook. Routes init to the right runtime so
 * Sentry's per-runtime SDK doesn't ship code that can't run there
 * (e.g. node:fs imports in the edge runtime).
 *
 * Called once per process at startup. The runtime selectors are
 * documented at
 * https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}
