import type { MetadataRoute } from "next";

/**
 * sitemap.xml — minimal SEO manifest for both classic crawlers and
 * LLM web crawlers per docs/AI_SEARCH_STRATEGY.md §3. Lists the
 * publicly-indexable pages on both locales with priority + change
 * frequency hints.
 *
 * Excluded: /app (auth-gated), /api (machine-only), `/setup`
 * (auth-gated path nested under /app).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

const PUBLIC_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/terms", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.5, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
