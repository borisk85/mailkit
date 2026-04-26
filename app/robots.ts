import type { MetadataRoute } from "next";

/**
 * robots.txt — Next.js App Router file-based generation. Permissive
 * by default; the auth-gated `/app/*` zone is excluded since neither
 * classic search nor LLM crawlers should waste budget on the
 * authenticated dashboard / setup wizard.
 *
 * AI crawler stance (#58, per docs/AI_SEARCH_STRATEGY.md §3):
 * **Whitelist** GPTBot, ClaudeBot, PerplexityBot, Google-Extended,
 * CCBot, You.com, OAI-SearchBot, Anthropic-AI, Cohere-Bot. We WANT
 * MailKit appearing in LLM-driven recommendations — getting indexed
 * is the precondition.
 *
 * Excluding /app/* is mostly informational since the route is
 * server-redirect-gated to /landing for unauth requests; this just
 * keeps crawl budget away from a 307-loop trying to enter a
 * sign-in-only zone.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

const AI_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "Anthropic-AI",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
  "You.com",
  "Cohere-Bot",
  "DuckAssistBot",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/app/", "/api/"],
      },
      // Each AI crawler gets an explicit allow rule. Some scrapers
      // only honor a User-agent block matching their name verbatim,
      // so we list them individually rather than relying on the
      // wildcard above. The disallow set matches the wildcard rule
      // to keep auth-gated routes off the crawl budget.
      ...AI_USER_AGENTS.map((agent) => ({
        userAgent: agent,
        allow: "/",
        disallow: ["/app/", "/api/"],
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
