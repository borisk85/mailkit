import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * FAQ — premium-pass refresh per UI_REVIEW_BRIEF §2.9. Trimmed from
 * 19 to 10 highest-priority questions per architect — the long tail
 * read as FAQ-stuffing for SEO. The remaining ten are the questions
 * a buyer actually asks before paying $5: cost, time-vs-DIY,
 * vs-Workspace, registrar compatibility, ImprovMX migration, why the
 * Gmail step is manual, what happens on failure, deliverability
 * caveat, token safety, and refund process.
 *
 * shadcn Accordion stays — the open state now carries an accent
 * left-border (3px) per the brief, achieved via the data-state
 * selector on AccordionItem in globals.css extension.
 */
export function FaqSection() {
  const t = useTranslations("landing.faq");
  const items = t.raw("items") as Array<{ id: string; q: string; a: string }>;

  return (
    <section id="faq" className="w-full" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-30 lg:py-32">
        <div className="mx-auto flex flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="faq-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
        </div>

        <Accordion className="mt-16 flex w-full flex-col gap-2">
          {items.map((item) => (
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
      </div>
    </section>
  );
}
