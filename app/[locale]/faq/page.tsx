import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FaqSection } from "@/components/landing/faq-section";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { StructuredData } from "@/components/seo/structured-data";
import { faqPageSchema, type FaqItem } from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  void locale;
  return {
    title: "FAQ — MailKit",
    description:
      "Common questions about MailKit: Cloudflare DNS requirement, pricing, what happens on failure, Gmail automation, sending limits, and more.",
  };
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "landing.faq" });
  const faqItems = t.raw("items") as FaqItem[];
  return (
    <>
      <StructuredData data={faqPageSchema("en", faqItems)} />
      <Header />
      <main className="flex flex-1 flex-col">
        <FaqSection />
      </main>
      <Footer />
    </>
  );
}
