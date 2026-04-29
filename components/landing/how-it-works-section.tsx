import { useTranslations } from "next-intl";

/**
 * How it works — Design V2 §4.6 polish on top of the V1 four-card
 * timeline. Two changes vs V1:
 *
 *  - Headline rewrites to match the visual count ("Four steps. We do
 *    three. You do one." / "Четыре шага. Мы делаем три. Один — твой.")
 *    so the eye no longer counts four numbered cards under a "three"
 *    promise.
 *  - The first three (Automated) and the fourth (Your turn) get a
 *    visible separator at lg+. The connecting line breaks at the same
 *    column boundary so card 04 reads as a distinct hand-off.
 *
 * The standalone time pill inside each card was removed — the time is
 * already in the eyebrow next to the title and the second pill was
 * pushing the card past the readability threshold.
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
          <p className="mk-body-large max-w-xl text-balance text-mk-text-secondary">
            {t("subheading")}
          </p>
        </div>

        <div className="relative mt-16">
          {/* Connecting line spans only the three Automated cards.
           * Stops short of the divider + card 04 so the hand-off
           * reads as a separate phase. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-12 right-[28%] top-12 hidden h-px lg:block"
            style={{
              background:
                "linear-gradient(to right, rgba(124,92,255,0.5), rgba(124,92,255,0.1))",
            }}
          />

          <ol className="relative grid gap-6 lg:grid-cols-[repeat(3,minmax(0,1fr))_8px_minmax(0,1fr)] lg:gap-8">
            {steps.slice(0, 3).map(({ key, number, automated }) => (
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

            <div
              aria-hidden
              className="hidden lg:block self-stretch w-px bg-mk-border-strong mx-1"
            />

            {(() => {
              const s = steps[3];
              return (
                <StepCard
                  key={s.key}
                  number={s.number}
                  title={t(`${s.key}.title`)}
                  time={t(`${s.key}.time`)}
                  body={t(`${s.key}.body`)}
                  automated={s.automated}
                  automatedLabel={t("automatedBadge")}
                  manualLabel={t("manualBadge")}
                />
              );
            })()}
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
    <li className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-mk-border-subtle bg-surface-elevated p-8 mk-card-shadow">
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
        <h3 className="mk-heading-3 text-balance text-mk-text-primary">
          {title}
        </h3>
      </div>

      <p className="mk-body-small text-justify text-mk-text-secondary">
        {body}
      </p>
    </li>
  );
}
