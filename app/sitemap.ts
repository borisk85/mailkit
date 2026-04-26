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

const LOCALES = ["en", "ru"] as const;

type Route = {
  path: string;
  priority: number;
  changeFrequency: "monthly" | "weekly";
};

const PUBLIC_ROUTES: Route[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.5, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    for (const route of PUBLIC_ROUTES) {
      entries.push({
        url: `${SITE_URL}/${locale}${route.path}`,
        lastModified,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        // hreflang for the alternate locale — tells crawlers which
        // page is the localized variant of which.
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((alt) => [alt, `${SITE_URL}/${alt}${route.path}`]),
          ),
        },
      });
    }
  }

  return entries;
}
