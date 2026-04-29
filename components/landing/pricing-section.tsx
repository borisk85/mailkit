import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

/**
 * Pricing — Design V2 §4.7 polish on top of the V1 single-card layout.
 * Three deltas:
 *
 *  - Card surface lifted to `bg-surface-elevated-2` (V2 §1.1) so it
 *    reads as the climax of the page rather than blending with the
 *    surrounding cards.
 *  - The competitor compare line is now an inline 3-column micro-grid
 *    inside the card (Workspace · ImprovMX · Mailkit). The plain
 *    fallback line still sits below the card as reinforcement.
 *  - A "Have questions before paying?" link to the FAQ anchor below
 *    the card — gives skeptics a one-tap exit before checkout.
 *
 * Inclusions copy and labels follow the §4.13.6 plain-language sweep
 * (no `алиасы`, no English `wizard` inside RU prose).
 */
export function PricingSection() {
  const t = useTranslations("landing.pricing");
  const inclusions = t.raw("inclusions") as string[];

  return (
    <section id="pricing" className="w-full" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-30 lg:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="pricing-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large max-w-xl text-mk-text-secondary">
            {t("subhead")}
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-[480px]">
          <article className="flex flex-col gap-6 rounded-[20px] border-2 border-mk-border-strong bg-surface-elevated-2 p-10 mk-card-shadow-strong">
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
                    className="mt-1 size-4 shrink-0 text-mk-accent"
                    aria-hidden
                  />
                  <span className="mk-body-small text-mk-text-primary">
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="rounded-lg border border-mk-border-subtle bg-surface-base/40 p-3">
              <p className="mk-caption mb-2 text-mk-text-tertiary">
                {t("compareLabel")}
              </p>
              <ul className="grid grid-cols-3 gap-3 text-center">
                <li>
                  <p className="font-mono text-sm text-mk-text-secondary">
                    $6/mo
                  </p>
                  <p className="text-[11px] text-mk-text-tertiary">Workspace</p>
                </li>
                <li>
                  <p className="font-mono text-sm text-mk-text-secondary">
                    $9/mo
                  </p>
                  <p className="text-[11px] text-mk-text-tertiary">ImprovMX</p>
                </li>
                <li>
                  <p className="font-mono text-sm font-semibold text-mk-accent">
                    $5 once
                  </p>
                  <p className="text-[11px] text-mk-accent">Mailkit</p>
                </li>
              </ul>
            </div>

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

          <p className="mk-caption mt-6 text-center text-mk-text-tertiary">
            {t("compare")}
          </p>

          <p className="mk-caption mt-3 text-center text-mk-text-tertiary">
            <a
              href="#faq"
              className="underline-offset-4 hover:text-mk-text-secondary hover:underline"
            >
              {t("faqLink")}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
