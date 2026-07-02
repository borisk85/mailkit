import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import {
  SiApplepay,
  SiGooglepay,
  SiLemonsqueezy,
  SiStripe,
} from "react-icons/si";

import { LandingCtaButton } from "@/components/landing/landing-cta-button";

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
        <div className="mk-scroll-reveal mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
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

        <div className="mk-scroll-reveal relative mx-auto mt-16 max-w-[480px]">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem]"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, rgba(124,92,255,0.14), transparent 70%)",
              filter: "blur(12px)",
            }}
          />
          <article className="mk-pricing-card flex flex-col gap-6 rounded-[20px] p-10 mk-card-shadow-strong">
            <div>
              <span className="mk-display-1 text-mk-text-primary">
                {t("price")}
              </span>
              <p className="mk-body-small mt-1 text-mk-text-tertiary">
                {t("priceUnit")}
              </p>
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

            <LandingCtaButton
              label={t("cta")}
              className="mk-cta-shadow mk-hover-lift mk-cta-shine inline-flex h-[52px] w-full items-center justify-center rounded-[10px] bg-mk-accent px-7 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
            />

            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
              <span className="mk-caption text-mk-text-tertiary">
                {t("poweredBy")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <SiLemonsqueezy size={13} color="#FFC233" aria-hidden />
                <span className="mk-caption font-medium text-mk-text-secondary">
                  Lemon Squeezy
                </span>
              </span>
              <span aria-hidden className="mk-caption text-mk-text-tertiary">
                ·
              </span>
              <span
                role="img"
                aria-label={t("paymentMethods")}
                className="inline-flex items-center gap-2.5 text-mk-text-tertiary"
              >
                <SiStripe size={15} aria-hidden />
                <SiApplepay size={20} aria-hidden />
                <SiGooglepay size={20} aria-hidden />
              </span>
            </div>
          </article>

          <p className="mk-caption mt-3 text-center">
            <a
              href="#faq"
              className="font-medium text-mk-accent underline-offset-4 hover:underline"
            >
              {t("faqLink")}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
