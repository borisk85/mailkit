import { setRequestLocale } from "next-intl/server";

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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
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
