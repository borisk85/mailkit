import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * App-zone footer. Mirrors the landing footer minus the columnar
 * structure — only the legal links matter inside the auth'd zone
 * (LS checkout consent and Google OAuth verification both require an
 * in-app legal link path, not just the landing-side one).
 */
export function AppFooter() {
  const t = useTranslations("footer");
  const locale = useLocale();
  return (
    <footer className="mt-auto flex w-full flex-col items-center justify-between gap-2 border-t border-mk-border-subtle px-6 py-6 text-xs text-mk-text-tertiary sm:flex-row">
      <span>{t("copyright")}</span>
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/terms`}
          className="transition-colors hover:text-mk-text-primary"
        >
          {t("links.terms")}
        </Link>
        <Link
          href={`/${locale}/privacy`}
          className="transition-colors hover:text-mk-text-primary"
        >
          {t("links.privacy")}
        </Link>
        <Link
          href={`/${locale}/guarantee`}
          className="transition-colors hover:text-mk-text-primary"
        >
          {t("links.guarantee")}
        </Link>
      </div>
    </footer>
  );
}
