import { useTranslations } from "next-intl";
import { Check, HelpCircle } from "lucide-react";

import { LandingCtaButton } from "@/components/landing/landing-cta-button";

/**
 * Landing hero — asymmetric 7/5 grid (left content / right mockup).
 *
 * The mockup shows a Gmail Compose window with the From-row stack as
 * the visual punchline: the user's old @gmail address (struck-through)
 * + two custom-domain addresses (highlighted with the Mailkit badge).
 * In one glance: "switch your From from gmail.com to yourdomain.com".
 * Decorative chrome (Inbox label, draft-saved indicator, dot menus) is
 * removed so the From rows are the only thing competing for attention.
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

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-20 sm:px-6 sm:py-30 md:grid-cols-12 md:gap-12 md:py-32 lg:py-32">
        <div className="flex flex-col gap-6 md:col-span-7">
          <h1
            id="hero-heading"
            className="mk-display-1 text-balance text-mk-text-primary"
          >
            <span className="block">{t("headlineLine1")}</span>
            <span className="block bg-gradient-to-br from-violet-200 via-violet-400 to-mk-accent bg-clip-text text-transparent">
              in 30 minutes — no tech skills needed.
            </span>
          </h1>

          <p className="mk-body-large text-mk-text-secondary">{t("subhead")}</p>

          <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-x-6">
            <LandingCtaButton
              label={t("primaryCta")}
              className="mk-cta-shadow mk-hover-lift group inline-flex h-[52px] items-center justify-center gap-2 rounded-[10px] bg-mk-accent px-7 text-base font-semibold text-white hover:bg-mk-accent-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base"
            />
            <a
              href="#how-it-works"
              className="mk-hover-lift inline-flex h-[52px] items-center gap-1.5 rounded-[10px] border border-mk-border-strong px-7 text-base font-medium text-mk-text-secondary transition-colors hover:bg-surface-elevated hover:text-mk-text-primary"
            >
              {t("secondaryCta")}
            </a>
          </div>

          <p className="inline-flex items-center gap-1 text-xs text-mk-text-tertiary">
            {t("microcopy")}
            <a
              href="https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/"
              target="_blank"
              rel="noreferrer"
              className="group relative inline-flex"
            >
              <HelpCircle
                className="size-3.5 text-mk-text-tertiary transition-colors group-hover:text-mk-accent"
                aria-label={t("migrationHint")}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-mk-border-subtle bg-surface-elevated-2 px-3 py-2 text-xs text-mk-text-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
                {t("migrationHint")}
              </span>
            </a>
          </p>
        </div>

        <div className="md:col-span-5">
          <GmailComposeMockup />
        </div>
      </div>

      <div id="hero-end-sentinel" aria-hidden className="h-px" />
    </section>
  );
}

function GmailComposeMockup() {
  const t = useTranslations("landing.hero.mockup");

  return (
    <div
      className="relative mx-auto w-full max-w-[calc(100vw-32px)] sm:max-w-md lg:max-w-none"
      style={{ perspective: "1200px" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 hidden rounded-[2.5rem] lg:block"
        style={{
          background:
            "radial-gradient(at top right, rgba(124,92,255,0.18), transparent 65%)",
          filter: "blur(16px)",
        }}
      />

      <div
        role="img"
        aria-label={t("alt")}
        className="mk-mockup-tilt rounded-2xl border border-mk-border-strong bg-surface-elevated-2 p-5 mk-card-shadow-strong"
      >
        <div className="mb-4 border-b border-mk-border-subtle pb-3">
          <span className="text-xs font-semibold text-mk-text-secondary">
            {t("windowTitle")}
          </span>
        </div>

        <div className="space-y-2">
          <FromRow
            value={t("fromDefault")}
            badge={t("fromDefaultBadge")}
            muted
          />
          <FromRow
            value={t("fromCustom1")}
            badgePrefix={t("fromCustomBadgePrefix")}
            badge={t("fromCustomBadge")}
            highlighted
          />
          <FromRow
            value={t("fromCustom2")}
            badgePrefix={t("fromCustomBadgePrefix")}
            badge={t("fromCustomBadge")}
            highlighted
          />
        </div>

        <div className="mt-3 space-y-2 border-t border-mk-border-subtle pt-3">
          <CompactRow label={t("toLabel")} value={t("toPlaceholder")} />
          <CompactRow
            label={t("subjectLabel")}
            value={t("subjectPlaceholder")}
          />
        </div>

        <div
          aria-hidden
          className="mt-3 flex min-h-[60px] flex-col gap-2 rounded-md bg-surface-base/50 p-3"
        >
          <span className="block h-2 w-3/5 rounded-full bg-mk-text-tertiary/20" />
          <span className="block h-2 w-4/5 rounded-full bg-mk-text-tertiary/20" />
          <span className="block h-2 w-2/5 rounded-full bg-mk-text-tertiary/20" />
        </div>

        <div className="mt-4">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none inline-flex h-8 items-center rounded-md bg-mk-text-tertiary/30 px-4 text-xs font-semibold text-mk-text-secondary"
          >
            {t("sendButton")}
          </button>
        </div>
      </div>
    </div>
  );
}

function FromRow({
  value,
  badge,
  badgePrefix,
  highlighted = false,
  muted = false,
}: {
  value: string;
  badge: string;
  badgePrefix?: string;
  highlighted?: boolean;
  muted?: boolean;
}) {
  if (highlighted) {
    return (
      <div className="flex items-center justify-between rounded-md border border-mk-accent/40 bg-mk-accent/[0.06] px-3 py-2 ring-1 ring-mk-accent/20">
        <span className="font-mono text-xs font-medium text-mk-text-primary">
          {value}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {badgePrefix && (
            <span className="text-[10px] font-medium text-mk-text-tertiary">
              {badgePrefix}
            </span>
          )}
          <span className="rounded-full bg-mk-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mk-accent">
            {badge}
          </span>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-md px-3 py-2">
      <span
        className={
          muted
            ? "font-mono text-xs text-mk-text-tertiary line-through"
            : "font-mono text-xs text-mk-text-secondary"
        }
      >
        {value}
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-mk-text-tertiary">
        <Check className="size-3" aria-hidden />
        {badge}
      </span>
    </div>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 px-3 text-xs">
      <span className="font-medium text-mk-text-tertiary">{label}:</span>
      <span className="text-mk-text-secondary">{value}</span>
    </div>
  );
}
