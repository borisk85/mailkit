import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

/**
 * Landing hero — asymmetric 7/5 grid (left content / right mockup).
 *
 * The mockup is an opened-email view, not a Compose window. The visual
 * punchline is the From-row: a custom-domain address with a "via
 * Mailkit" badge — i.e. exactly what recipients see in their inbox
 * after onboarding. Subject + body are realistic SMB/freelance copy so
 * the mockup reads as a real message, not a placeholder.
 */
export function Hero() {
  const t = useTranslations("landing.hero");

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]"
        style={{
          background:
            "radial-gradient(ellipse 800px 400px at 75% 20%, rgba(124,92,255,0.12), transparent 70%)",
        }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-20 sm:px-6 sm:py-30 lg:grid-cols-12 lg:gap-12 lg:py-32">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <h1
            id="hero-heading"
            className="mk-display-1 text-balance text-mk-text-primary"
          >
            <span className="block">{t("headlineLine1")}</span>
            <span className="block">{t("headlineLine2")}</span>
            <span className="mk-display-fade block">{t("headlineLine3")}</span>
          </h1>

          <p className="mk-body-large max-w-2xl text-balance text-mk-text-secondary">
            {t("subhead")}
          </p>

          <div className="mt-2 flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href={withFirst100Discount(LEMON_SQUEEZY_CHECKOUT_URL)}
                target="_blank"
                rel="noreferrer"
                className="mk-cta-shadow group inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-mk-accent px-7 text-base font-semibold text-white transition-all hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
                style={{ minHeight: 52 }}
              >
                {t("primaryCta")}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-1.5 text-base font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
              >
                <span className="underline-offset-4 group-hover:underline">
                  {t("secondaryCta")}
                </span>
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </a>
            </div>
            <p className="mk-caption text-mk-text-tertiary">{t("priceNote")}</p>
          </div>

          <p className="mk-caption mt-2 text-mk-text-tertiary">
            {t("trustNote")}
          </p>
        </div>

        <div className="lg:col-span-5">
          <InboxMessageMockup />
        </div>
      </div>

      <div id="hero-end-sentinel" aria-hidden className="h-px" />
    </section>
  );
}

function InboxMessageMockup() {
  const t = useTranslations("landing.hero.mockup");
  const initial = t("fromName").charAt(0).toUpperCase();

  return (
    <div
      className="relative mx-auto w-full max-w-[calc(100vw-32px)] sm:max-w-md lg:max-w-none"
      style={{ perspective: "1200px" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 hidden lg:block"
        style={{
          background:
            "radial-gradient(at top right, rgba(124,92,255,0.16), transparent 60%)",
        }}
      />

      <div
        role="img"
        aria-label={t("alt")}
        className="mk-mockup-tilt rounded-2xl border border-mk-border-strong bg-surface-elevated-2 p-5 mk-card-shadow-strong"
      >
        <div className="mb-4 flex items-center gap-2 border-b border-mk-border-subtle pb-3 text-[11px] text-mk-text-tertiary">
          <ArrowLeft className="size-3.5" aria-hidden />
          <span className="font-medium">{t("backToInbox")}</span>
        </div>

        <h3 className="mb-4 text-base font-semibold leading-snug text-mk-text-primary">
          {t("subject")}
        </h3>

        <div className="mb-4 flex items-start gap-3">
          <div
            aria-hidden
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mk-accent/15 text-sm font-semibold text-mk-accent"
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-mk-text-primary">
                {t("fromName")}
              </span>
              <span className="shrink-0 text-[11px] text-mk-text-tertiary">
                {t("date")}
              </span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1 rounded-md border border-mk-accent/40 bg-mk-accent/[0.08] px-2 py-0.5 font-mono text-[11px] font-medium text-mk-text-primary ring-1 ring-mk-accent/20">
                {t("fromEmail")}
              </span>
              <span className="rounded-full bg-mk-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mk-accent">
                {t("fromBadge")}
              </span>
            </div>
            <span className="mt-1 block text-[11px] text-mk-text-tertiary">
              {t("to")}
            </span>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-mk-border-subtle pt-4 text-sm leading-relaxed text-mk-text-secondary">
          <p>{t("bodyP1")}</p>
          <p>{t("bodyP2")}</p>
          <p>{t("bodyP3")}</p>
          <p className="text-mk-text-primary">{t("signature")}</p>
        </div>
      </div>
    </div>
  );
}
