import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        <div className="mx-auto flex flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="faq-heading"
            className={`${compactHeading ? "mk-heading-1" : "mk-display-2"} text-balance text-mk-text-primary`}
          >
            {t("heading")}
          </h2>
        </div>

        <Accordion className="mt-16 flex w-full flex-col gap-2">
          {displayed.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="mk-faq-item rounded-xl border border-mk-border-subtle bg-surface-elevated px-6 py-1 transition-colors hover:bg-surface-elevated/60"
            >
              <AccordionTrigger className="mk-heading-3 text-left text-mk-text-primary">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="mk-body text-mk-text-secondary">
                <p className="max-w-[65ch]">{item.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

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
