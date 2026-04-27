import { useTranslations } from "next-intl";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * FAQ section (#11 etap 3 + #59). 19 questions covering buying
 * objections, technical edge cases, and operational risks. Wording
 * follows docs/AI_SEARCH_STRATEGY.md §4: each question is the
 * literal user phrasing, the first sentence answers directly with
 * concrete numbers, then the supporting paragraph fills in.
 *
 * Why 19 (not the architect's "15-20"): we have 19 distinct buyer
 * questions with non-overlapping answers. Adding a 20th would be a
 * variant of an existing one and makes the list noisier without
 * helping AI crawlers — they cite the most-cited variant anyway.
 *
 * The Accordion component is shadcn-on-base-ui; the trigger toggle
 * is interactive but the content text is in the initial HTML so
 * crawlers (LLM and classic SEO) read every answer regardless of
 * client-side hydration.
 */
export function FaqSection() {
  const t = useTranslations("landing.faq");
  const items = t.raw("items") as Array<{ id: string; q: string; a: string }>;

  return (
    <section
      id="faq"
      className="border-t border-neutral-200 bg-white py-20 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-medium tracking-wide text-indigo-600 uppercase dark:text-indigo-400">
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full bg-indigo-500"
            />
            {t("subheading")}
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl dark:text-neutral-50">
            {t("heading")}
          </h2>
        </div>

        <Accordion className="w-full">
          {items.map((item) => (
            <AccordionItem
              key={item.id}
              value={item.id}
              className="border-neutral-200 dark:border-neutral-800"
            >
              <AccordionTrigger className="text-left text-base font-medium text-neutral-950 hover:text-indigo-700 dark:text-neutral-50 dark:hover:text-indigo-400">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                <p>{item.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
