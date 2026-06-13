import Link from "next/link";
import { useTranslations } from "next-intl";

import { LandingCtaButton } from "@/components/landing/landing-cta-button";

/**
 * Final CTA — premium-pass refresh per UI_REVIEW_BRIEF §2.10. Bigger
 * primary button (h-15 / 60px / Heading 3 weight 600) with an ambient
 * accent radial-glow behind the headline. Secondary text link sends
 * the still-unsure scroll-to-end visitor to /guarantee instead of the
 * (already-passed) #how-it-works anchor.
 *
 * Trust row is canonical: 4 short items (money-back, no-subscription,
 * 5-min setup, cancel anytime) — same vocabulary the buyer's been
 * hearing across hero/pricing/trust, repeated last so it's the line
 * fresh in mind right when they're about to click.
 */
export function FinalCtaSection() {
  const t = useTranslations("landing.finalCta");

  return (
    <section className="relative w-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 800px 400px at 50% 50%, rgba(124,92,255,0.08), transparent 70%)",
        }}
      />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6 sm:py-30 lg:py-32">
        <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
        <h2 className="mk-display-1 text-balance text-mk-text-primary">
          {t("heading")}
        </h2>
        <p className="mk-body-large max-w-xl text-mk-text-secondary">
          {t("subhead")}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <LandingCtaButton
            label={t("primaryCta")}
            className="mk-cta-shadow mk-hover-lift group inline-flex h-[60px] items-center justify-center gap-2 rounded-[10px] bg-mk-accent px-9 text-lg font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          />
          <Link
            href="/guarantee"
            className="group inline-flex items-center gap-1.5 text-base font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            <span className="underline-offset-4 group-hover:underline">
              {t("secondaryCta")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
