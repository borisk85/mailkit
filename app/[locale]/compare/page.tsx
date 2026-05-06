import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Compare — MailKit",
    description: "MailKit vs alternatives",
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <h1 className="mk-display-2 text-mk-text-primary">Compare</h1>
        <p className="mk-body-large mt-4 text-mk-text-secondary">
          Coming soon.
        </p>
      </main>
      <Footer />
    </>
  );
}
