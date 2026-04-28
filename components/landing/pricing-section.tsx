import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

/**
 * Pricing — premium-pass refresh per UI_REVIEW_BRIEF §2.7. Centered
 * eyebrow + Display-2 headline + Body-large subhead, then a single
 * pricing card with a stronger border (no gradient text on the price)
 * and a competitor-comparison row underneath. The bundle / monitoring
 * upsell links from the previous version were dropped — architect's
 * call: keep the page focused on the $5 setup primary path.
 */
export function PricingSection() {
  const t = useTranslations("landing.pricing");
  const inclusions = t.raw("inclusions") as string[];

  return (
    <section id="pricing" className="w-full" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="pricing-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large max-w-xl text-balance text-mk-text-secondary">
            {t("subhead")}
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-[480px]">
          <article className="flex flex-col gap-6 rounded-[20px] border-2 border-mk-border-strong bg-surface-elevated p-10 mk-card-shadow">
            <span className="mk-eyebrow text-mk-text-tertiary">
              {t("badge")}
            </span>

            <div className="flex items-baseline gap-3">
              <span className="mk-display-1 text-mk-text-primary">
                {t("price")}
              </span>
              <span className="mk-body-large text-mk-text-tertiary">
                {t("priceUnit")}
              </span>
            </div>

            <div className="h-px w-full bg-mk-border-subtle" />

            <ul className="flex flex-col gap-3">
              {inclusions.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <Check
                    className="mt-1 size-4 shrink-0 text-mk-success"
                    aria-hidden
                  />
                  <span className="mk-body-small text-mk-text-primary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <a
              href={withFirst100Discount(LEMON_SQUEEZY_CHECKOUT_URL)}
              target="_blank"
              rel="noreferrer"
              className="mk-cta-shadow inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-mk-accent px-7 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
            >
              {t("cta")}
            </a>

            <p className="mk-caption text-center text-mk-text-tertiary">
              {t("paymentNote")}
            </p>
          </article>

          <p className="mk-caption mt-8 text-center text-mk-text-tertiary">
            {t("compare")}
          </p>
        </div>
      </div>
    </section>
  );
}
