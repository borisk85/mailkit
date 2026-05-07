import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/ru", destination: "/en", permanent: true },
      { source: "/ru/privacy", destination: "/en/privacy", permanent: true },
      { source: "/ru/terms", destination: "/en/terms", permanent: true },
      {
        source: "/ru/guarantee",
        destination: "/en/guarantee",
        permanent: true,
      },
      { source: "/ru/faq", destination: "/en/faq", permanent: true },
      { source: "/ru/status", destination: "/en/status", permanent: true },
      {
        source: "/ru/app/:path*",
        destination: "/en/app/:path*",
        permanent: true,
      },
    ];
  },
};

const composed = withBundleAnalyzer(withNextIntl(nextConfig));

// Sentry wrapper goes outermost so it can hook the build to upload
// source maps when SENTRY_AUTH_TOKEN is present. Org / project come
// from env so they don't leak into the repo (the DSN itself is
// public-safe; the auth token is not).
//
// Local `pnpm build` without the auth token still works — the
// wrapper logs a warning and skips the upload. Production builds on
// Vercel get full source-map upload once the token lands.
export default withSentryConfig(composed, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  disableLogger: true,
  telemetry: false,
});
