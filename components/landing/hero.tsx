import { useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

/**
 * Landing hero — premium-pass refresh per UI_REVIEW_BRIEF §2.3.
 *
 * Asymmetric 7/5 grid (left content / right product mockup) replaces
 * the prior centered 60/40 layout. Display-1 headline split into three
 * short lines with the last muted (text-secondary) for visual rhythm.
 *
 * Right-side Gmail Compose mockup is the product anchor — three
 * "From:" addresses (default Gmail + two custom-domain ones highlighted
 * with accent ring) communicate the actual deliverable in one glance.
 * Mockup gets a 3D tilt and ambient accent glow on lg+; on mobile it
 * stacks under the text without perspective or glow for performance.
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
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>

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

          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
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

          <p className="mk-caption mt-2 text-mk-text-tertiary">
            {t("trustNote")}
          </p>
        </div>

        <div className="lg:col-span-5">
          <GmailComposeMockup />
        </div>
      </div>

      {/* Sentinel for the cookie banner — once it scrolls into view
       * the banner is allowed to mount. Keeps the hero clean on first
       * paint per Design V2 §3. */}
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
        <div className="mb-3 flex items-center justify-between text-[10px] text-mk-text-tertiary">
          <span className="font-medium">{t("inboxLabel")}</span>
          <span className="font-mono">{t("draftSavedLabel")}</span>
        </div>
        <div className="mb-4 flex items-center justify-between border-b border-mk-border-subtle pb-3">
          <span className="text-xs font-semibold text-mk-text-secondary">
            {t("windowTitle")}
          </span>
          <div className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-mk-text-tertiary/30" />
            <span className="size-2 rounded-full bg-mk-text-tertiary/30" />
            <span className="size-2 rounded-full bg-mk-text-tertiary/30" />
          </div>
        </div>

        <div className="space-y-2">
          <FromRow
            label={t("fromLabel")}
            value={t("fromDefault")}
            badge={t("fromDefaultBadge")}
            muted
          />
          <FromRow
            label={t("fromLabel")}
            value={t("fromCustom1")}
            badge={t("fromCustomBadge")}
            highlighted
          />
          <FromRow
            label={t("fromLabel")}
            value={t("fromCustom2")}
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

        <div className="mt-3 min-h-[60px] rounded-md bg-surface-base/50 p-3">
          <span className="text-xs text-mk-text-tertiary">
            {t("bodyPlaceholder")}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none inline-flex h-8 items-center rounded-md bg-mk-accent px-4 text-xs font-semibold text-white"
          >
            {t("sendButton")}
          </button>
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-mk-text-tertiary/40" />
            <span className="size-1.5 rounded-full bg-mk-text-tertiary/40" />
            <span className="size-1.5 rounded-full bg-mk-text-tertiary/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FromRow({
  label,
  value,
  badge,
  highlighted = false,
  muted = false,
}: {
  label: string;
  value: string;
  badge: string;
  highlighted?: boolean;
  muted?: boolean;
}) {
  if (highlighted) {
    return (
      <div className="flex items-center justify-between rounded-md border border-mk-accent/40 bg-mk-accent/[0.06] px-3 py-2 ring-1 ring-mk-accent/20">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-medium text-mk-text-tertiary">{label}</span>
          <span className="font-mono font-medium text-mk-text-primary">
            {value}
          </span>
        </div>
        <span className="rounded-full bg-mk-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mk-accent">
          {badge}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-md px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-medium text-mk-text-tertiary">{label}</span>
        <span
          className={
            muted
              ? "font-mono text-mk-text-tertiary line-through"
              : "font-mono text-mk-text-secondary"
          }
        >
          {value}
        </span>
      </div>
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
      <span className="font-medium text-mk-text-tertiary">{label}</span>
      <span className="text-mk-text-secondary">{value}</span>
    </div>
  );
}
