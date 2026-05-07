import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-6 px-4 py-20 text-center sm:px-6">
        <p className="mk-display-2 text-mk-text-tertiary">404</p>
        <h1 className="mk-heading-1 text-mk-text-primary">{t("title")}</h1>
        <p className="mk-body max-w-md text-mk-text-secondary">{t("body")}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link
            href="/"
            className="mk-cta-shadow group inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-mk-accent px-7 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          >
            {t("homeCta")}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
          <Link
            href="/faq"
            className="text-base font-medium text-mk-text-secondary underline-offset-4 transition-colors hover:text-mk-text-primary hover:underline"
          >
            {t("faqCta")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
