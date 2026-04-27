import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

/**
 * Problem section — Linear/Notion split, "Without MailKit" (red) vs
 * "With MailKit" (indigo). Desktop: two columns, mobile: stacked with
 * the MailKit side second so the "good news" is what the user lands
 * on after scrolling. Per LANDING_SPEC_V1.md sections 3.3 and 9.2.
 *
 * Icons in the card corner give the scanner a visual handle before the
 * text-heavy lists register. Bullet glyph is lucide AlertCircle on the
 * DIY side and CheckCircle2 on the MailKit side — same component
 * family as the Gmail wizard uses, keeps the visual language
 * consistent across the product.
 */
export function ProblemSection() {
  const tWithout = useTranslations("landing.problem.without");
  const tWith = useTranslations("landing.problem.with");
  const tRoot = useTranslations("landing.problem");

  const withoutSteps = tWithout.raw("steps") as string[];
  const withSteps = tWith.raw("steps") as string[];

  return (
    <section
      id="problem"
      className="w-full border-b border-neutral-200 dark:border-neutral-800"
      aria-labelledby="problem-heading"
    >
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <h2
          id="problem-heading"
          className="mx-auto max-w-3xl text-balance text-center text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl dark:text-neutral-50"
        >
          {tRoot("heading")}
        </h2>

        <div className="mt-16 grid gap-8 lg:grid-cols-2 lg:gap-6">
          {/* Without MailKit — red accent, DIY pain list. */}
          <article className="relative flex flex-col gap-6 rounded-2xl border border-red-300/30 bg-red-50/40 p-8 dark:border-red-900/40 dark:bg-red-950/20">
            <header className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600 ring-1 ring-red-500/20 dark:bg-red-500/15 dark:text-red-400 dark:ring-red-400/30">
                <Clock className="size-5" aria-hidden />
              </span>
              <h3 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                {tWithout("title")}
              </h3>
            </header>
            <ul className="space-y-3">
              {withoutSteps.map((step) => (
                <li key={step} className="flex items-start gap-3">
                  <AlertCircle
                    className="mt-0.5 size-4 shrink-0 text-red-500 dark:text-red-400"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {step}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-auto rounded-lg bg-red-500/10 px-4 py-3 text-sm font-medium text-red-900 dark:bg-red-500/15 dark:text-red-200">
              {tWithout("total")}
            </p>
          </article>

          {/* With MailKit — indigo accent, short clean list. */}
          <article className="relative flex flex-col gap-6 rounded-2xl border border-indigo-300/30 bg-indigo-50/40 p-8 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <header className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 ring-1 ring-indigo-500/20 dark:bg-indigo-500/15 dark:text-indigo-400 dark:ring-indigo-400/30">
                <Clock className="size-5" aria-hidden />
              </span>
              <h3 className="text-xl font-semibold text-neutral-950 dark:text-neutral-50">
                {tWith("title")}
              </h3>
            </header>
            <ul className="space-y-3">
              {withSteps.map((step) => (
                <li key={step} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-indigo-500 dark:text-indigo-400"
                    aria-hidden
                  />
                  <span className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {step}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-auto rounded-lg bg-indigo-500/10 px-4 py-3 text-sm font-medium text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-200">
              {tWith("total")}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
