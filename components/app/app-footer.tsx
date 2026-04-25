import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * App-zone footer. Mirrors the landing footer minus the tagline so the
 * /terms link is reachable from any authenticated page (LS checkout
 * consent and Google OAuth verification both require an in-app legal
 * link path, not just a landing-side one).
 */
export function AppFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();
  return (
    <footer className="flex w-full flex-col items-center justify-between gap-2 border-t border-zinc-200 px-6 py-6 text-xs text-zinc-500 sm:flex-row dark:border-zinc-800">
      <span>{t("copyright")}</span>
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/terms`}
          className="transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {t("terms")}
        </Link>
        <Link
          href={`/${locale}/privacy`}
          className="transition-colors hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {t("privacy")}
        </Link>
      </div>
    </footer>
  );
}
