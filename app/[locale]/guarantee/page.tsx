import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { LegalDocLayout } from "@/components/legal/legal-doc-layout";
import { GUARANTEE_EN, GUARANTEE_RU } from "@/lib/legal/guarantee";

/**
 * Static refund-guarantee page. Matches /terms and /privacy
 * structure one-for-one — same Header / Footer / prose layout, same
 * `whitespace-pre-wrap` strategy that preserves the source paragraph
 * + numbered structure exactly.
 *
 * Canonical text in `lib/legal/guarantee.ts`, ultimately sourced
 * from `docs/GUARANTEE_POLICY.md` "Formal policy" canonical EN/RU
 * blocks. Any wording change lands in the docs file first; this
 * page tracks via the test in `lib/legal/guarantee.test.ts`.
 *
 * Existing references that this page unblocks (live links that
 * previously 404'd):
 *   - components/landing/hero.tsx — "(see policy)" tagline link
 *   - public/llms.txt manifest entry
 *   - lib/seo/structured-data.ts SoftwareApplication description
 *   - components/app/dashboard/resources-section.tsx workaround on
 *     `/terms#section-3` can move to `/guarantee` in a follow-up
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale === "ru") {
    return {
      title: "Гарантия — MailKit",
      description:
        "Двухуровневая гарантия MailKit: автоматический возврат при сбое автоматики плюс 30-дневная функциональная гарантия по запросу.",
    };
  }
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

  const text = locale === "ru" ? GUARANTEE_RU : GUARANTEE_EN;
  const title = locale === "ru" ? "Гарантия возврата" : "Refund guarantee";
  const lastUpdated =
    locale === "ru" ? "Обновлено 25.04.2026" : "Updated 2026-04-25";
  const lede =
    locale === "ru"
      ? "Mailkit стоит $5. Если наша автоматика сломалась на нашей стороне — возврат автоматический в течение 24 часов. Если в течение 30 дней не можешь реально отправлять почту со своего домена — тоже возврат, по запросу в support. Ниже — точная политика для краевых случаев."
      : "Mailkit costs $5. If our setup fails on our end, you get the $5 back automatically within 24 hours. If within 30 days you can't actually send email through your domain, you also get your $5 back — just email support. The full policy below explains the edge cases.";

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
