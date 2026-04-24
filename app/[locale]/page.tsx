import { setRequestLocale } from "next-intl/server";

import { AnnouncementBanner } from "@/components/landing/announcement-banner";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { IntegrationsBar } from "@/components/landing/integrations-bar";

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
      </main>
      <Footer />
    </>
  );
}
