import { useTranslations } from "next-intl";

/**
 * How it works — vertical timeline (replaced the 5-narrow-cards grid).
 * A 5-step process with wildly different durations reads as a journey,
 * not a card gallery: left rail carries the step number + a connector
 * that "draws" itself on scroll (CSS scroll-driven animation, static
 * line where unsupported), right side gives each step a full-width row
 * so the long DKIM step no longer distorts the layout.
 */
export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    { key: "stepToken", number: "01", automated: false },
    { key: "step1", number: "02", automated: false },
    { key: "step2", number: "03", automated: true },
    { key: "step3", number: "04", automated: true },
    { key: "step4", number: "05", automated: false },
  ] as const;

  return (
    <section
      id="how-it-works"
      className="relative w-full overflow-hidden"
      aria-labelledby="how-it-works-heading"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
        style={{
          background:
            "radial-gradient(ellipse 700px 360px at 50% 0%, rgba(124,92,255,0.08), transparent 70%)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-30 lg:px-8 lg:py-32">
        <div className="mk-scroll-reveal mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="how-it-works-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large max-w-xl text-mk-text-secondary">
            {t("subheading")}
          </p>
        </div>

        <ol className="mx-auto mt-16 flex max-w-3xl flex-col">
          {steps.map(({ key, number, automated }, i) => (
            <TimelineStep
              key={key}
              number={number}
              title={t(`${key}.title`)}
              time={t(`${key}.time`)}
              body={t(`${key}.body`)}
              automated={automated}
              automatedLabel={t("automatedBadge")}
              manualLabel={t("manualBadge")}
              isLast={i === steps.length - 1}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function TimelineStep({
  number,
  title,
  time,
  body,
  automated,
  automatedLabel,
  manualLabel,
  isLast,
}: {
  number: string;
  title: string;
  time: string;
  body: string;
  automated: boolean;
  automatedLabel: string;
  manualLabel: string;
  isLast: boolean;
}) {
  return (
    <li className="mk-scroll-reveal relative grid grid-cols-[2.5rem_1fr] gap-x-5 sm:grid-cols-[3rem_1fr] sm:gap-x-8">
      <div aria-hidden className="flex flex-col items-center">
        <span
          className="flex size-10 shrink-0 select-none items-center justify-center rounded-full border bg-surface-elevated font-mono text-sm font-semibold sm:size-12"
          style={{
            borderColor: automated
              ? "color-mix(in srgb, var(--mk-accent) 45%, transparent)"
              : "color-mix(in srgb, var(--mk-success) 45%, transparent)",
            color: automated ? "var(--mk-accent)" : "var(--mk-success)",
          }}
        >
          {number}
        </span>
        {!isLast && <span className="mk-timeline-segment my-2 w-px flex-1" />}
      </div>

      <div
        className={`flex flex-col gap-2.5 pt-1.5 sm:pt-2.5 ${isLast ? "" : "pb-12"}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{
              backgroundColor: automated
                ? "rgba(124, 92, 255, 0.12)"
                : "rgba(34, 197, 94, 0.12)",
              color: automated ? "var(--mk-accent)" : "var(--mk-success)",
            }}
          >
            {automated ? automatedLabel : manualLabel}
          </span>
          <span className="mk-caption font-mono text-mk-accent">{time}</span>
        </div>

        <h3 className="text-lg font-semibold leading-snug tracking-tight text-mk-text-primary">
          {title}
        </h3>

        <p className="mk-body max-w-2xl text-mk-text-secondary">{body}</p>
      </div>
    </li>
  );
}
