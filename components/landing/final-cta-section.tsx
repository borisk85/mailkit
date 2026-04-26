import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * Final CTA — last block before the footer. Mirrors the hero's CTA
 * pair (primary buy + secondary "see how") for the user who scrolled
 * the whole landing and is ready (or close to ready). Plus the
 * first-100 reassurance line that re-states the discount the
 * announcement banner mentions at the top — fresh in mind right when
 * they're about to click.
 *
 * The primary CTA target is `/{locale}/app` because the auth gate
 * there bounces unauth users to Google OAuth → the LS checkout flow
 * starts from /app for repeat-buyers via /api/checkout/start; the
 * landing-first-buy path goes directly to LS checkout via the
 * announcement banner. This CTA lands in the middle ground — kicks
 * off Google OAuth so a future LS checkout can stamp user_id.
 */
export function FinalCtaSection() {
  const t = useTranslations("landing.finalCta");
  const locale = useLocale();

  return (
    <section className="border-t border-neutral-200 bg-gradient-to-b from-neutral-50 to-white py-20 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-950">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl dark:text-neutral-50">
          {t("heading")}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-600 dark:text-neutral-400">
          {t("body")}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/${locale}/app`}
            className="inline-flex items-center justify-center rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-neutral-50 shadow-sm transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {t("primaryCta")}
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-50 dark:hover:bg-neutral-800"
          >
            {t("secondaryCta")}
          </a>
        </div>

        <p className="mt-6 text-xs text-neutral-500 dark:text-neutral-500">
          {t("reassurance")}
        </p>
      </div>
    </section>
  );
}
