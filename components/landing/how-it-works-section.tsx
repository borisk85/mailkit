import { useTranslations } from "next-intl";

/**
 * How it works — premium-pass refresh per UI_REVIEW_BRIEF §2.6.
 * Four-step horizontal timeline (3 automated + 1 your-turn) replaces
 * the prior 3-card grid. Architect's call to split out DNS verification
 * as its own step — being honest about what we actually do.
 *
 * Connecting line between cards on lg+ shows flow direction; on mobile
 * the timeline collapses to a vertical stack with a left-side rail.
 * Step 4 (Gmail Send-As) carries the "Your turn" pill in accent color
 * to visually separate the part where the user takes over.
 */
export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    { key: "step1", number: "01", automated: true },
    { key: "step2", number: "02", automated: true },
    { key: "step3", number: "03", automated: true },
    { key: "step4", number: "04", automated: false },
  ] as const;

  return (
    <section
      id="how-it-works"
      className="w-full"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="how-it-works-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large max-w-xl text-balance text-mk-text-secondary">
            {t("subheading")}
          </p>
        </div>

        <div className="relative mt-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-12 top-12 hidden h-px lg:block"
            style={{
              background:
                "linear-gradient(to right, rgba(124,92,255,0.5), rgba(124,92,255,0.1))",
            }}
          />

          <ol className="relative grid gap-6 lg:grid-cols-4 lg:gap-6">
            {steps.map(({ key, number, automated }) => (
              <StepCard
                key={key}
                number={number}
                title={t(`${key}.title`)}
                time={t(`${key}.time`)}
                body={t(`${key}.body`)}
                automated={automated}
                automatedLabel={t("automatedBadge")}
                manualLabel={t("manualBadge")}
              />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StepCard({
  number,
  title,
  time,
  body,
  automated,
  automatedLabel,
  manualLabel,
}: {
  number: string;
  title: string;
  time: string;
  body: string;
  automated: boolean;
  automatedLabel: string;
  manualLabel: string;
}) {
  return (
    <li className="relative flex flex-col gap-4 rounded-2xl border border-mk-border-subtle bg-surface-elevated p-6 mk-card-shadow">
      <div className="flex items-center justify-between">
        <span
          className="font-semibold tracking-tight text-mk-accent"
          style={{ fontSize: "32px", lineHeight: "1" }}
        >
          {number}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            backgroundColor: automated
              ? "rgba(34, 197, 94, 0.12)"
              : "rgba(124, 92, 255, 0.12)",
            color: automated ? "var(--mk-success)" : "var(--mk-accent)",
          }}
        >
          {automated ? automatedLabel : manualLabel}
        </span>
      </div>

      <h3 className="mk-heading-3 text-mk-text-primary">{title}</h3>

      <span
        className="inline-flex w-fit items-center rounded-full px-2.5 py-1 font-mono text-xs font-semibold text-mk-accent"
        style={{ backgroundColor: "rgba(124, 92, 255, 0.12)" }}
      >
        {time}
      </span>

      <p className="mk-body-small text-mk-text-secondary">{body}</p>
    </li>
  );
}
