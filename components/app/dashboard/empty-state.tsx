import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * First-visit empty state. Shown when the user has zero setups AND
 * zero purchases — i.e. brand-new account that landed on /app
 * before paying. The CTA points at /app/setup which itself enforces
 * the purchase gate (#7) once that ships in production.
 */
export function DashboardEmptyState({ locale }: { locale: string }) {
  const t = useTranslations("dashboard.emptyState");
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
      <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {t("title")}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        {t("body")}
      </p>
      <Link href={`/${locale}/app/setup`} className="mt-4 inline-flex">
        <Button>{t("cta")}</Button>
      </Link>
    </div>
  );
}
