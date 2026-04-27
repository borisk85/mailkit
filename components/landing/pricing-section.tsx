import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

/**
 * Pricing — Linear single-card simplicity per LANDING_SPEC_V1.md
 * section 3.5 + 9.2. Centered card, max-w 480px, huge $5 display
 * typography, emerald-checkmark inclusions, CTA matching hero
 * primary. Bundle and monitoring mentions render as muted text
 * links below the card so they don't compete with the primary.
 *
 * Server component. CTA is a plain <a target="_blank"> to the Lemon
 * Squeezy checkout — no client JS needed.
 */
export function PricingSection() {
  const t = useTranslations("landing.pricing");
  const inclusions = t.raw("inclusions") as string[];

  return (
    <section
      id="pricing"
      className="w-full border-b border-neutral-200 dark:border-neutral-800"
      aria-labelledby="pricing-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <h2
          id="pricing-heading"
          className="text-balance text-center text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl dark:text-neutral-50"
        >
          {t("heading")}
        </h2>

        <div className="mx-auto mt-16 max-w-[480px]">
          <article className="relative flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-neutral-50/40 p-8 shadow-xl shadow-indigo-500/5 backdrop-blur-sm sm:p-10 dark:border-neutral-800 dark:bg-neutral-900/40 dark:shadow-indigo-500/10">
            {/* Price stack — display $5 + subscript + no-recurring pill. */}
            <header className="flex flex-col items-center text-center">
              <div className="flex items-baseline gap-2">
                <span className="bg-gradient-to-r from-indigo-500 to-violet-600 bg-clip-text text-7xl font-bold leading-none tracking-tight text-transparent sm:text-8xl">
                  {t("price")}
                </span>
              </div>
              <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                {t("priceNote")}
              </p>
              <span className="mt-4 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30">
                {t("noRecurring")}
              </span>
            </header>

            <div className="h-px w-full bg-neutral-200 dark:bg-neutral-800" />

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                {t("inclusionsHeading")}
              </h3>
              <ul className="mt-4 space-y-3">
                {inclusions.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      className="mt-0.5 size-5 shrink-0 text-emerald-500 dark:text-emerald-400"
                      aria-hidden
                    />
                    <span className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-xs text-neutral-500 dark:text-neutral-400">
              {t("noSubscription")}
            </p>

            <a
              href={withFirst100Discount(LEMON_SQUEEZY_CHECKOUT_URL)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-13 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-7 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-950"
              style={{ minHeight: 52 }}
            >
              {t("cta")}
            </a>
          </article>

          {/* Ghost text links — bundle + monitoring. Visual weight
              intentionally low so they don't pull attention from the
              primary CTA. */}
          <div className="mt-8 space-y-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
            <p>
              {t("bundleHint")}{" "}
              <a
                href="#pricing"
                className="text-neutral-600 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                {t("bundleLinkText")}
              </a>
            </p>
            <p>
              {t("monitoringHint")}{" "}
              <a
                href="#pricing"
                className="text-neutral-600 underline underline-offset-4 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
              >
                {t("monitoringLinkText")}
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
