import { useTranslations } from "next-intl";
import { Check, Rocket, Wrench, X } from "lucide-react";

import { LandingCtaButton } from "@/components/landing/landing-cta-button";

/**
 * Problem section — premium-pass refresh per UI_REVIEW_BRIEF §2.5.
 * Centered eyebrow + Display-2 headline + Body-large subhead, then a
 * side-by-side card pair: DIY route (muted, warning bullet) vs MailKit
 * route (accent border + green check bullets).
 *
 * The Display number "60–90 min" / "5 min" sits in the card top-row
 * — architect's call so the time delta is the visual punchline before
 * the user reads the step lists.
 */
export function ProblemSection() {
  const t = useTranslations("landing.problem");
  const tHero = useTranslations("landing.hero");
  const tWithout = useTranslations("landing.problem.without");
  const tWith = useTranslations("landing.problem.with");

  const withoutSteps = tWithout.raw("steps") as string[];
  const withSteps = tWith.raw("steps") as string[];

  return (
    <section id="problem" className="w-full" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-30 lg:py-32">
        <div className="mk-scroll-reveal mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="problem-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large text-balance text-mk-text-secondary">
            {t("subhead")}
          </p>
        </div>

        <div className="mk-scroll-reveal-group mt-16 grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <article className="flex h-full flex-col gap-6 rounded-2xl border border-mk-border-subtle bg-surface-elevated p-8 mk-card-shadow">
            <header className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Wrench className="size-5 text-mk-text-tertiary" aria-hidden />
                <h3 className="text-base font-semibold text-mk-text-secondary">
                  {tWithout("title")}
                </h3>
              </div>
              <span
                className="font-semibold tracking-tight text-mk-text-secondary"
                style={{ fontSize: "32px", lineHeight: "1" }}
              >
                {tWithout("duration")}
              </span>
            </header>
            <ul className="flex flex-1 flex-col justify-evenly gap-y-2.5">
              {withoutSteps.map((step) => (
                <li
                  key={step}
                  className="flex items-start gap-3 px-2 py-1.5 text-mk-text-tertiary"
                >
                  <X
                    className="mt-1 size-4 shrink-0 text-mk-text-tertiary"
                    aria-hidden
                  />
                  <span className="mk-body-small">{step}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="flex h-full flex-col gap-6 rounded-2xl border border-mk-accent bg-surface-elevated p-8 mk-card-shadow transition-transform duration-300 hover:-translate-y-0.5">
            <header className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Rocket className="size-5 text-mk-accent" aria-hidden />
                <span className="rounded-full bg-mk-accent/15 px-3 py-1 text-[13px] font-semibold uppercase tracking-wide text-mk-accent">
                  Mailkit
                </span>
              </div>
              <span
                className="font-semibold tracking-tight text-mk-text-primary/90"
                style={{ fontSize: "32px", lineHeight: "1" }}
              >
                {tWith("duration")}
              </span>
            </header>
            <ul className="space-y-2.5">
              {withSteps.map((step) => (
                <li key={step} className="flex items-start gap-3 px-2 py-1.5">
                  <Check
                    className="mt-1 size-4 shrink-0 text-mk-accent"
                    aria-hidden
                  />
                  <span className="mk-body-small text-mk-text-primary/85">
                    {step}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Section-level CTA pattern: centered primary button + caption
         * underneath (the caption anchors the button — a bare centered
         * button reads as orphaned). The caption rides inside
         * LandingCtaButton so it hides when the button flips to
         * "My account" for logged-in users. Reuse this exact block for
         * any future mid-page section CTA. */}
        <div className="mt-12 flex justify-center">
          <LandingCtaButton
            label={tHero("primaryCta")}
            caption={t("ctaNote")}
            className="mk-cta-shadow mk-hover-lift mk-cta-shine inline-flex h-[52px] items-center justify-center rounded-[10px] bg-mk-accent px-7 text-base font-semibold text-white transition-colors hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
          />
        </div>
      </div>
    </section>
  );
}
