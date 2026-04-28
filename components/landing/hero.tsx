import { useTranslations } from "next-intl";
import { ArrowRight, Check } from "lucide-react";

import {
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "@/lib/constants/lemon-squeezy";

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

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 py-20 sm:px-6 sm:py-30 lg:grid-cols-12 lg:gap-12 lg:py-32">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <h1
            id="hero-heading"
            className="mk-display-1 text-balance text-mk-text-primary"
          >
            <span className="block">{t("headlineLine1")}</span>
            <span className="block bg-gradient-to-br from-violet-300 via-fuchsia-400 to-mk-accent bg-clip-text text-transparent">
              {t("headlineLine2")}
            </span>
          </h1>

          <p className="mk-body-large text-mk-text-secondary">{t("subhead")}</p>

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

          <ul className="mt-2 flex flex-wrap gap-2">
            {t("trustNote")
              .split(" · ")
              .map((item) => (
                <li
                  key={item}
                  className="inline-flex items-center gap-1.5 rounded-full border border-mk-border-subtle bg-surface-elevated/60 px-3 py-1 text-xs font-medium text-mk-text-secondary"
                >
                  <Check
                    className="size-3.5 text-mk-accent"
                    aria-hidden
                    strokeWidth={2.5}
                  />
                  {item}
                </li>
              ))}
          </ul>
        </div>

        <div className="lg:col-span-5">
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
            badge={t("fromCustomBadge")}
            highlighted
          />
          <FromRow
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
            className="pointer-events-none inline-flex h-8 items-center rounded-md bg-[#1A73E8] px-4 text-xs font-semibold text-white"
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
  highlighted = false,
  muted = false,
}: {
  value: string;
  badge: string;
  highlighted?: boolean;
  muted?: boolean;
}) {
  if (highlighted) {
    return (
      <div className="flex items-center justify-between rounded-md border border-mk-accent/40 bg-mk-accent/[0.06] px-3 py-2 ring-1 ring-mk-accent/20">
        <span className="font-mono text-xs font-medium text-mk-text-primary">
          {value}
        </span>
        <span className="rounded-full bg-mk-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mk-accent">
          {badge}
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
