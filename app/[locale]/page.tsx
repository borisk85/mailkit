import { setRequestLocale } from "next-intl/server";

import { AnnouncementBanner } from "@/components/landing/announcement-banner";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { IntegrationsBar } from "@/components/landing/integrations-bar";
import { ProblemSection } from "@/components/landing/problem-section";

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
      </main>
      <Footer />
    </>
  );
}
