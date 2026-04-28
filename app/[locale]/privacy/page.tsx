import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { LegalDocLayout } from "@/components/legal/legal-doc-layout";
import { PRIVACY_EN, PRIVACY_RU } from "@/lib/legal/privacy";

/**
 * Static Privacy Policy page. Mirrors /terms structure (same Header /
 * Footer / prose layout). Source-of-truth content lives in
 * lib/legal/privacy.ts, ultimately in docs/PRIVACY_POLICY.md.
 *
 * Required by Google OAuth verification (#36) — the URL of this page
 * is supplied as the "Privacy policy URL" on the consent screen.
 * Section 11 of the canonical text is wording-locked (Google API
 * Services User Data Policy phrasing) — see lib/legal/privacy.ts
 * header for the immutability rule.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale === "ru") {
    return {
      title: "Политика конфиденциальности — MailKit",
      description:
        "Как MailKit собирает, использует и защищает информацию о пользователях. Раскрытие Limited Use по Google API Services User Data Policy.",
    };
  }
  return {
    title: "Privacy Policy — MailKit",
    description:
      "How MailKit collects, uses, and protects information about users. Includes Google API Services User Data Policy Limited Use disclosure.",
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const text = locale === "ru" ? PRIVACY_RU : PRIVACY_EN;
  const title =
    locale === "ru" ? "Политика конфиденциальности" : "Privacy Policy";
  const lastUpdated =
    locale === "ru" ? "Обновлено 2026-04-25" : "Last updated 2026-04-25";

  return (
    <>
      <Header />
      <LegalDocLayout
        title={title}
        lastUpdatedLabel={lastUpdated}
        body={text}
      />
      <Footer />
    </>
  );
}
