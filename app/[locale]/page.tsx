import { getTranslations, setRequestLocale } from "next-intl/server";

import { AnnouncementBanner } from "@/components/landing/announcement-banner";
import { FaqSection } from "@/components/landing/faq-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { IntegrationsBar } from "@/components/landing/integrations-bar";
import { PricingSection } from "@/components/landing/pricing-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { TrustSection } from "@/components/landing/trust-section";
import { SectionHashTracker } from "@/components/landing/section-hash-tracker";
import { StructuredData } from "@/components/seo/structured-data";
import { landingGraph, type FaqItem } from "@/lib/seo/structured-data";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Pull the FAQ items the SSR renders into FaqSection so the schema
  // mainEntity matches the visible Q/A pairs verbatim — the whole
  // point of FAQPage schema is one source of truth between visible
  // copy and structured data.
  const t = await getTranslations({ locale, namespace: "landing.faq" });
  const faqItems = t.raw("items") as FaqItem[];
  const schemaLocale: "en" | "ru" = locale === "ru" ? "ru" : "en";

  return (
    <>
      <StructuredData data={landingGraph(schemaLocale, faqItems)} />
      <AnnouncementBanner />
      <Header />
      <main className="flex flex-1 flex-col">
        <Hero />
        <IntegrationsBar />
        <ProblemSection />
        <HowItWorksSection />
        <PricingSection />
        <TrustSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
    </>
  );
}
