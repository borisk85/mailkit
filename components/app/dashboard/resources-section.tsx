import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Section: links to legal pages + support email. /terms, /privacy
 * and /guarantee are the three SSG legal surfaces — all three
 * routes are live.
 */
export function ResourcesSection({ locale }: { locale: string }) {
  const t = useTranslations("dashboard.resources");

  const supportAddress = t("supportAddress");

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {t("title")}
      </h2>
      <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <li>
          <Link
            href={`/${locale}/terms`}
            className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {t("terms")}
          </Link>
        </li>
        <li>
          <Link
            href={`/${locale}/privacy`}
            className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {t("privacy")}
          </Link>
        </li>
        <li>
          <Link
            href={`/${locale}/guarantee`}
            className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {t("guarantee")}
          </Link>
        </li>
        <li>
          <a
            href={`mailto:${supportAddress}`}
            className="text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {t("support")}
          </a>
        </li>
      </ul>
    </section>
  );
}
