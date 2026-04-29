import { useTranslations } from "next-intl";
import { Check, HelpCircle, Rocket, Wrench } from "lucide-react";

/**
 * Problem section — premium-pass refresh per UI_REVIEW_BRIEF §2.5.
 * Centered eyebrow + Display-2 headline + Body-large subhead, then a
 * side-by-side card pair: DIY route (muted, warning bullet) vs MailKit
 * route (accent border + green check bullets).
 *
 * The Display number "60–90 min" / "5 min" sits in the card top-row
 * — architect's call so the time delta is the visual punchline before
 * the user reads the step lists.
 */
export function ProblemSection() {
  const t = useTranslations("landing.problem");
  const tWithout = useTranslations("landing.problem.without");
  const tWith = useTranslations("landing.problem.with");

  const withoutSteps = tWithout.raw("steps") as string[];
  const withSteps = tWith.raw("steps") as string[];

  return (
    <section id="problem" className="w-full" aria-labelledby="problem-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-30 lg:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="problem-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large text-balance text-mk-text-secondary">
            {t("subhead")}
          </p>
        </div>

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
          <article className="flex h-full flex-col gap-6 rounded-2xl border border-mk-border-subtle bg-surface-elevated p-8 mk-card-shadow">
            <header className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Wrench className="size-5 text-mk-text-tertiary" aria-hidden />
                <h3 className="text-base font-semibold text-mk-text-secondary">
                  {tWithout("title")}
                </h3>
              </div>
              <span
                className="font-semibold tracking-tight text-mk-text-secondary"
                style={{ fontSize: "32px", lineHeight: "1" }}
              >
                {tWithout("duration")}
              </span>
            </header>
            <ul className="space-y-2.5">
              {withoutSteps.map((step) => (
                <li
                  key={step}
                  className="flex items-start gap-3 px-2 py-1.5 text-mk-text-tertiary"
                >
                  <span
                    className="mt-2 size-1 shrink-0 rounded-full bg-mk-text-tertiary"
                    aria-hidden
                  />
                  <span className="mk-body-small">{step}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="flex h-full flex-col gap-6 rounded-2xl border border-mk-accent bg-surface-elevated p-8 mk-card-shadow transition-transform duration-300 hover:-translate-y-0.5">
            <header className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Rocket className="size-5 text-mk-accent" aria-hidden />
                <span className="rounded-full bg-mk-accent/15 px-3 py-1 text-[13px] font-semibold uppercase tracking-wide text-mk-accent">
                  Mailkit
                </span>
              </div>
              <span
                className="font-semibold tracking-tight text-mk-text-primary/90"
                style={{ fontSize: "32px", lineHeight: "1" }}
              >
                {tWith("duration")}
              </span>
            </header>
            <ul className="space-y-2.5">
              {withSteps.map((step, i) => (
                <li key={step} className="flex items-start gap-3 px-2 py-1.5">
                  <Check
                    className="mt-1 size-4 shrink-0 text-mk-accent"
                    aria-hidden
                  />
                  <span className="inline-flex items-start gap-1">
                    <span className="mk-body-small text-mk-text-primary/85">
                      {step}
                    </span>
                    {i === 1 && (
                      <a
                        href="https://dash.cloudflare.com/profile/api-tokens"
                        target="_blank"
                        rel="noreferrer"
                        title={tWith("tokenHint")}
                        className="group relative mt-0.5 shrink-0 inline-flex"
                      >
                        <HelpCircle
                          className="size-3.5 text-mk-text-tertiary transition-colors group-hover:text-mk-accent"
                          aria-label={tWith("tokenHint")}
                        />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-mk-border-subtle bg-surface-elevated-2 px-3 py-2 text-xs text-mk-text-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:block">
                          {tWith("tokenHint")}
                        </span>
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
