/**
 * Schema.org structured-data builders for #57. Pure functions, no
 * runtime dependencies — the consuming server component injects the
 * JSON-LD `<script>` tag at SSR time so AI crawlers (and classic
 * search) read the schemas in the initial HTML response.
 *
 * Schema choices align with docs/AI_SEARCH_STRATEGY.md §3.2:
 *   - Organization     — brand identity, surfaces in knowledge panels
 *   - SoftwareApplication — the product itself, key for "best email
 *                            setup tool" type queries
 *   - Product + Offer  — pricing for shopping aggregators + LLMs
 *                         that compare on price
 *   - FAQPage          — every FAQ item (#59) becomes a Question
 *                         node so LLMs can cite the Q/A directly
 *
 * The site URL comes from NEXT_PUBLIC_SITE_URL with a getmailkit.com
 * fallback so dev / preview previews still emit a complete schema
 * document instead of relative URLs that AI crawlers reject.
 */

const DEFAULT_SITE_URL = "https://getmailkit.com";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL;
}

function abs(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

export type FaqItem = { id: string; q: string; a: string };

export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl()}/#organization`,
    name: "MailKit",
    url: siteUrl(),
    logo: abs("/brand/mailkit-logo-full.png"),
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@getmailkit.com",
      contactType: "customer support",
      availableLanguage: ["English"],
    },
  };
}

export function softwareApplicationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl()}/#software-application`,
    name: "MailKit",
    description:
      "MailKit configures custom domain email in 5 minutes — Cloudflare Email Routing for receiving, Postmark SMTP for sending, guided Gmail Send-As wizard. $5 one-time per mailbox.",
    url: siteUrl(),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "en",
    publisher: { "@id": `${siteUrl()}/#organization` },
    offers: {
      "@type": "Offer",
      price: "5.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      category: "OneTimePayment",
    },
  };
}

export function productSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteUrl()}/#product`,
    name: "MailKit — custom domain email setup",
    description:
      "One-time custom domain email setup in 5 minutes. Includes Cloudflare Email Routing, Postmark SMTP authentication, and guided Gmail Send-As wizard. Money-back guarantee on automation failure.",
    brand: { "@id": `${siteUrl()}/#organization` },
    offers: {
      "@type": "Offer",
      price: "5.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `${siteUrl()}/#pricing`,
    },
  };
}

export function faqPageSchema(
  _locale: "en",
  items: FaqItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${siteUrl()}/#faq`,
    inLanguage: "en",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      "@id": `${siteUrl()}/#faq-${item.id}`,
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

/**
 * Build the full landing-page schema graph as a single
 * `@graph`-rooted document. One `<script>` tag is cheaper than four
 * for the crawler — it parses one JSON, walks the entries via
 * `@id` cross-references, no need to chase multiple HTTP responses
 * or scripts.
 */
export function landingGraph(
  _locale: "en",
  faqItems: FaqItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema(),
      softwareApplicationSchema(),
      productSchema(),
      faqPageSchema("en", faqItems),
    ],
  };
}
