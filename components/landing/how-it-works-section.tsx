import { useTranslations } from "next-intl";

export function HowItWorksSection() {
  const t = useTranslations("landing.howItWorks");

  const steps = [
    { key: "stepToken", number: "01", automated: false },
    { key: "step1", number: "02", automated: true },
    { key: "step2", number: "03", automated: true },
    { key: "step3", number: "04", automated: true },
    { key: "step4", number: "05", automated: false },
  ] as const;

  return (
    <section
      id="how-it-works"
      className="w-full overflow-hidden"
      aria-labelledby="how-it-works-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-30 lg:px-8 lg:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
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

        <ol className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
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
    <li className="mk-hover-lift relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-mk-border-subtle bg-surface-elevated p-8 mk-card-shadow">
      <span
        aria-hidden
        className="pointer-events-none absolute right-4 top-3 select-none font-mono text-5xl font-bold leading-none text-mk-accent/10"
      >
        {number}
      </span>
      <div className="flex items-center justify-between">
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
      </div>

      <div className="flex flex-col gap-3">
        <span className="mk-caption font-mono text-mk-accent">{time}</span>
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-mk-text-primary">
          {title}
        </h3>
      </div>

      <p className="mk-body-small text-mk-text-secondary">{body}</p>
    </li>
  );
}
