import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * Trust section — between the pricing block and FAQ. Three guarantee
 * cards (auto-refund / 30-day functional / honest deliverability)
 * speak directly to the buying objections we hear: "what if it
 * fails", "what if it doesn't work for me", "is this going to land
 * in spam". Honest deliverability framing comes from #24 + the
 * canonical disclaimer in lib/legal/disclaimer.ts; we keep it on the
 * landing so the customer reads the responsibility-attribution copy
 * BEFORE buying, not as a surprise after.
 *
 * Visual language matches the rest of etap 1+2: indigo accent,
 * neutral typography, soft cards with hairline borders. No icons —
 * keeps the section quiet next to the pricing card above and the
 * FAQ accordion below.
 */
export function TrustSection() {
  const t = useTranslations("landing.trust");
  const locale = useLocale();
  const items = t.raw("items") as Array<{ title: string; body: string }>;

  return (
    <section
      id="trust"
      className="border-t border-neutral-200 bg-neutral-50 py-20 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <h3 className="text-base font-semibold text-neutral-950 dark:text-neutral-50">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                {item.body}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-neutral-600 dark:text-neutral-400">
          <Link
            href={`/${locale}/terms`}
            className="font-medium text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400"
          >
            {t("policyLinkLabel")}
          </Link>
        </p>
      </div>
    </section>
  );
}
