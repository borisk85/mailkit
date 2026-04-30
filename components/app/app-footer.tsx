import Link from "next/link";
import { useTranslations } from "next-intl";

export function AppFooter() {
  const t = useTranslations("footer");
  return (
    <footer className="mt-auto flex w-full flex-col items-center justify-between gap-2 border-t border-mk-border-subtle px-6 py-6 text-xs text-mk-text-tertiary sm:flex-row">
      <span>{t("copyright")}</span>
      <div className="flex items-center gap-4">
        <Link
          href="/terms"
          className="transition-colors hover:text-mk-text-primary"
        >
          {t("links.terms")}
        </Link>
        <Link
          href="/privacy"
          className="transition-colors hover:text-mk-text-primary"
        >
          {t("links.privacy")}
        </Link>
        <Link
          href="/guarantee"
          className="transition-colors hover:text-mk-text-primary"
        >
          {t("links.guarantee")}
        </Link>
      </div>
    </footer>
  );
}
