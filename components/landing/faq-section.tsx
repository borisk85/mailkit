import Link from "next/link";
import { useTranslations } from "next-intl";

import { FaqAccordion } from "@/components/landing/faq-accordion";

export function FaqSection({
  previewCount,
  compactHeading,
}: { previewCount?: number; compactHeading?: boolean } = {}) {
  const t = useTranslations("landing.faq");
  const items = t.raw("items") as Array<{ id: string; q: string; a: string }>;
  const displayed =
    previewCount !== undefined ? items.slice(0, previewCount) : items;
  const hasMore = previewCount !== undefined && items.length > previewCount;

  return (
    <section id="faq" className="w-full" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-30 lg:py-32">
        <div className="mk-scroll-reveal mx-auto flex flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="faq-heading"
            className={`${compactHeading ? "mk-heading-1" : "mk-display-2"} text-balance text-mk-text-primary`}
          >
            {t("heading")}
          </h2>
        </div>

        <FaqAccordion
          items={displayed}
          className="mk-scroll-reveal-group mt-16 flex w-full flex-col gap-2"
        />

        {hasMore && (
          <div className="mt-10 text-center">
            <Link
              href="/faq"
              className="mk-body inline-flex items-center gap-1 font-medium text-mk-accent underline underline-offset-4 transition-opacity hover:opacity-70"
            >
              {t("seeAll", { count: items.length })}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
