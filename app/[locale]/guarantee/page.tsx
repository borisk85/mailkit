import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { LegalDocLayout } from "@/components/legal/legal-doc-layout";
import { GUARANTEE_EN } from "@/lib/legal/guarantee";

/**
 * Static refund-guarantee page. Matches /terms and /privacy
 * structure one-for-one — same Header / Footer / prose layout, same
 * `whitespace-pre-wrap` strategy that preserves the source paragraph
 * + numbered structure exactly.
 *
 * Canonical text in `lib/legal/guarantee.ts`, ultimately sourced
 * from `docs/GUARANTEE_POLICY.md` "Formal policy" canonical EN block.
 *
 * Existing references that this page unblocks (live links that
 * previously 404'd):
 *   - components/landing/hero.tsx — "(see policy)" tagline link
 *   - public/llms.txt manifest entry
 *   - lib/seo/structured-data.ts SoftwareApplication description
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Refund guarantee — MailKit",
    description:
      "MailKit's two-tier guarantee: automatic refund on automation failure, plus 30-day functional guarantee on request.",
  };
}

export default async function GuaranteePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const text = GUARANTEE_EN;
  const title = "Refund guarantee";
  const lastUpdated = "Updated 2026-04-25";
  const lede =
    "Mailkit costs $5. If our setup fails on our end, you get the $5 back automatically within 24 hours. If within 30 days you can't actually send email through your domain, you also get your $5 back. Just email support. The full policy below explains the edge cases.";

  return (
    <>
      <Header />
      <LegalDocLayout
        title={title}
        lastUpdatedLabel={lastUpdated}
        lede={lede}
        body={text}
      />
      <Footer />
    </>
  );
}
