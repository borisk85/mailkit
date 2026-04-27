import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { LEMON_SQUEEZY_CHECKOUT_URL } from "@/lib/constants/lemon-squeezy";

/**
 * Landing hero — Linear-pattern two-column layout per
 * LANDING_SPEC_V1.md section 9.2. Left 60% headline + subhead + CTA
 * pair, right 40% SVG 3-step schematic flow. Stacks on mobile, visual
 * below the text. Subtle indigo-to-violet gradient at ~5% opacity
 * behind the whole section for depth without distraction.
 *
 * Primary CTA opens the Lemon Squeezy checkout in a new tab —
 * impulse-buy path. Secondary CTA scrolls to the how-it-works section
 * (mounts in etap 2); the anchor link is rendered now so the hero
 * behavior stays stable once etap 2 lands.
 */
export function Hero() {
  const t = useTranslations("landing.hero");
  const locale = useLocale();

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Ambient background gradient — absolute, aria-hidden. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/5 via-transparent to-violet-500/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[560px] w-[1120px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.10),_transparent_70%)] blur-3xl"
      />

      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-5 lg:gap-16 lg:py-40">
        {/* Left column — text + CTAs, spans 3 of 5 (60%) on lg+. */}
        <div className="flex flex-col gap-6 lg:col-span-3">
          <h1
            id="hero-heading"
            className="text-balance text-5xl font-bold leading-[1.05] tracking-tight text-neutral-950 sm:text-6xl lg:text-7xl xl:text-[5rem] dark:text-neutral-50"
          >
            {t("headline")}
          </h1>
          <p className="flex flex-wrap items-baseline gap-1.5 text-lg italic text-neutral-500 dark:text-neutral-400">
            <span>{t("guaranteeSuffix")}</span>
            <a
              href={`/${locale}/guarantee`}
              className="text-base not-italic text-indigo-500 underline underline-offset-4 hover:text-indigo-400 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              ({t("guaranteeLink")})
            </a>
          </p>
          <p className="max-w-2xl text-balance text-lg leading-relaxed text-neutral-600 sm:text-xl dark:text-neutral-400">
            {t("body")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <a
              href={LEMON_SQUEEZY_CHECKOUT_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-7 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-50 dark:focus-visible:ring-offset-neutral-950"
              style={{ minHeight: 52 }}
            >
              {t("primaryCta")}
            </a>
            <a
              href="#how-it-works"
              className="inline-flex h-13 items-center gap-1.5 rounded-xl px-4 text-base font-medium text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-50"
              style={{ minHeight: 52 }}
            >
              {t("secondaryCta")}
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>

        {/* Right column — SVG 3-step schematic, spans 2 of 5 (40%) on lg+. */}
        <div className="flex items-center justify-center lg:col-span-2">
          <HeroVisual
            alt={t("visualAlt")}
            step1={t("visualStep1")}
            step2={t("visualStep2")}
            step3={t("visualStep3")}
            time1={t("visualStep1Time")}
            time2={t("visualStep2Time")}
            time3={t("visualStep3Time")}
          />
        </div>
      </div>
    </section>
  );
}

function HeroVisual({
  alt,
  step1,
  step2,
  step3,
  time1,
  time2,
  time3,
}: {
  alt: string;
  step1: string;
  step2: string;
  step3: string;
  time1: string;
  time2: string;
  time3: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-neutral-50/40 p-6 shadow-sm backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <ul className="space-y-3">
        <HeroVisualStep index={1} name={step1} time={time1} />
        <HeroVisualArrow />
        <HeroVisualStep index={2} name={step2} time={time2} />
        <HeroVisualArrow />
        <HeroVisualStep index={3} name={step3} time={time3} guided />
      </ul>
    </div>
  );
}

function HeroVisualStep({
  index,
  name,
  time,
  guided = false,
}: {
  index: number;
  name: string;
  time: string;
  guided?: boolean;
}) {
  const accent = guided
    ? "bg-violet-500/10 text-violet-600 ring-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/40"
    : "bg-indigo-500/10 text-indigo-600 ring-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/40";
  return (
    <li className="flex items-center gap-4">
      <span
        className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ring-1 ${accent}`}
      >
        {index}
      </span>
      <span className="flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {name}
      </span>
      <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
        {time}
      </span>
    </li>
  );
}

function HeroVisualArrow() {
  return (
    <li className="flex justify-start pl-4" aria-hidden>
      <span className="block h-5 w-px bg-neutral-300 dark:bg-neutral-700" />
    </li>
  );
}
