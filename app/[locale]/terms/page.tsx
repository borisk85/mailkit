import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { LegalDocLayout } from "@/components/legal/legal-doc-layout";
import { TERMS_EN } from "@/lib/legal/terms";

/**
 * Static Terms of Service page. Content is the canonical text from
 * docs/LEGAL_PROTECTIONS.md section 2.1.
 *
 * Required by:
 *   - LS checkout consent checkbox (links to /terms)
 *   - Landing footer + app footer + receipt email
 *   - Google OAuth verification submission (#36 unblocker)
 *
 * Server component, no client JS.
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Terms of Service — MailKit",
    description:
      "MailKit Terms of Service: what we do, pricing, refund policy, limitation of liability.",
  };
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const text = TERMS_EN;
  const title = "Terms of Service";
  const lastUpdated = "Updated 2026-04-25";
  const lede =
    "Mailkit is a one-time domain email setup for $5. We automate the technical side (Cloudflare and Postmark); you copy-paste four lines into Gmail. Refunds work two ways: automatic if our setup fails, on request within 30 days if you can't actually send email. The formal terms below cover the edge cases.";

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
