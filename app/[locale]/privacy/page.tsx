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
    locale === "ru" ? "Обновлено 25.04.2026" : "Updated 2026-04-25";
  const lede =
    locale === "ru"
      ? "Mailkit собирает минимум: твой email и имя из Google OAuth, домен который настраиваешь, оплату через Lemon Squeezy. Никаких маркетинговых трекеров, никаких рекламных пикселей. Никаких продаж данных третьим лицам. Полный текст — для регуляторов и любителей деталей — ниже."
      : "Mailkit collects the minimum: your email and name from Google OAuth, the domain you set up, and your Lemon Squeezy purchase record. No marketing trackers, no ad pixels, no data sold to third parties. The formal text below — for regulators and detail-readers — covers everything else.";

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
