import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { TERMS_EN, TERMS_RU } from "@/lib/legal/terms";

/**
 * Static Terms of Service page. Content is the canonical text from
 * docs/LEGAL_PROTECTIONS.md sections 2.1 (EN) and 2.2 (RU). Architect
 * directive: copy verbatim, do not paraphrase — the text is legally
 * vetted.
 *
 * Required by:
 *   - LS checkout consent checkbox (links to /terms)
 *   - Landing footer + app footer + receipt email
 *   - Google OAuth verification submission (#36 unblocker)
 *
 * Server component, no client JS. Metadata localized via next-intl.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale === "ru") {
    return {
      title: "Условия пользования — MailKit",
      description:
        "Условия пользования сервисом MailKit: что мы делаем, цены, политика возврата, ограничение ответственности.",
    };
  }
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

  const text = locale === "ru" ? TERMS_RU : TERMS_EN;

  return (
    <>
      <Header />
      <main className="container mx-auto flex flex-1 flex-col px-6 py-12">
        <article className="mx-auto w-full max-w-3xl whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-800 dark:text-zinc-200">
          {text}
        </article>
      </main>
      <Footer />
    </>
  );
}
