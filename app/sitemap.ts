import type { MetadataRoute } from "next";

import { posts } from "@/lib/blog-posts";

/**
 * sitemap.xml — minimal SEO manifest for both classic crawlers and
 * LLM web crawlers per docs/AI_SEARCH_STRATEGY.md §3. Lists the
 * publicly-indexable pages on both locales with priority + change
 * frequency hints.
 *
 * Excluded: /app (auth-gated), /api (machine-only), `/setup`
 * (auth-gated path nested under /app), /admin (auth-gated).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

const PUBLIC_ROUTES = [
  { path: "", priority: 1.0, changeFrequency: "weekly" as const },
  { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
  { path: "/compare", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" as const },
  { path: "/glossary", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/guarantee", priority: 0.6, changeFrequency: "monthly" as const },
  { path: "/about", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/terms", priority: 0.5, changeFrequency: "monthly" as const },
  { path: "/privacy", priority: 0.5, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes = PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const blogRoutes = posts
    .filter((p) => !p.hidden)
    .map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  return [...staticRoutes, ...blogRoutes];
}
