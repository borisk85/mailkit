import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

/**
 * How It Works — Stripe 3-card pattern per LANDING_SPEC_V1.md
 * sections 3.4 + 9.2. Three numbered cards horizontal on desktop
 * (grid-3), stacked on mobile. Desktop connecting arrows between
 * cards sit in the gap columns, hidden under md. Each card carries:
 * number badge + service wordmark (brand-tinted) + time pill +
 * title + body + note. Violet accent on step 3 (guided) for the
 * same "you are here" signal used in the hero visual.
 */
export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    {
      key: "step1",
      tint: "indigo" as const,
      brand: "text-[#F38020] dark:text-[#F6821F]", // Cloudflare orange
    },
    {
      key: "step2",
      tint: "indigo" as const,
      brand: "text-[#0B996E] dark:text-[#13B17E]", // Brevo teal
    },
    {
      key: "step3",
      tint: "violet" as const,
      brand: "text-[#D93025] dark:text-[#E95D54]", // Gmail red
    },
  ] as const;

  return (
    <section
      id="how-it-works"
      className="w-full border-b border-neutral-200 dark:border-neutral-800"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <header className="mx-auto max-w-3xl text-center">
          <h2
            id="how-it-works-heading"
            className="text-balance text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl dark:text-neutral-50"
          >
            {t("heading")}
          </h2>
          <p className="mt-5 text-balance text-lg text-neutral-600 dark:text-neutral-400">
            {t("subheading")}
          </p>
        </header>

        <div className="relative mt-16">
          {/* Desktop connecting track behind the cards. Two arrow
              segments rendered as absolutely-positioned elements so
              they span the gaps between cards. Hidden below lg. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-16 hidden lg:flex"
          >
            <div className="flex-1" />
            <ConnectingArrow />
            <div className="flex-1" />
            <ConnectingArrow />
            <div className="flex-1" />
          </div>

          <ol className="relative grid gap-6 lg:grid-cols-3 lg:gap-8">
            {steps.map((step, idx) => (
              <StepCard
                key={step.key}
                index={idx + 1}
                serviceLabel={t(`${step.key}.service`)}
                timeLabel={t(`${step.key}.time`)}
                title={t(`${step.key}.title`)}
                body={t(`${step.key}.body`)}
                note={t(`${step.key}.note`)}
                tint={step.tint}
                brandClass={step.brand}
              />
            ))}
          </ol>
        </div>

        <p className="mx-auto mt-16 max-w-2xl text-balance text-center text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          {t("closer")}
        </p>
      </div>
    </section>
  );
}

function StepCard({
  index,
  serviceLabel,
  timeLabel,
  title,
  body,
  note,
  tint,
  brandClass,
}: {
  index: number;
  serviceLabel: string;
  timeLabel: string;
  title: string;
  body: string;
  note: string;
  tint: "indigo" | "violet";
  brandClass: string;
}) {
  const badge =
    tint === "violet"
      ? "bg-violet-500/10 text-violet-600 ring-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-400/40"
      : "bg-indigo-500/10 text-indigo-600 ring-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/40";
  const timePill =
    tint === "violet"
      ? "bg-violet-500/10 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
      : "bg-indigo-500/10 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200";

  return (
    <li className="relative flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-50/40 p-6 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex size-9 items-center justify-center rounded-lg text-sm font-semibold ring-1 ${badge}`}
        >
          {index}
        </span>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${timePill}`}
        >
          {timeLabel}
        </span>
      </div>
      <div
        className={`text-base font-semibold tracking-tight ${brandClass}`}
        aria-label={serviceLabel}
      >
        {serviceLabel}
      </div>
      <h3 className="text-lg font-semibold text-neutral-950 dark:text-neutral-50">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        {body}
      </p>
      <p className="mt-auto rounded-lg bg-neutral-100/60 px-3 py-2 text-xs text-neutral-500 dark:bg-neutral-800/60 dark:text-neutral-400">
        {note}
      </p>
    </li>
  );
}

function ConnectingArrow() {
  return (
    <div className="relative flex w-16 items-center justify-center">
      <span className="block h-px w-full bg-gradient-to-r from-transparent via-neutral-300 to-transparent dark:via-neutral-700" />
      <ArrowRight
        className="absolute right-0 size-3 text-neutral-400 dark:text-neutral-600"
        aria-hidden
      />
    </div>
  );
}
