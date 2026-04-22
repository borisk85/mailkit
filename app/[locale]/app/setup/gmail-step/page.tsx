import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/ui/button";

/**
 * Gmail Send-As placeholder. Ticket #6 will flesh out the wizard; for
 * now we land users here from the Brevo terminal CTA so they see an
 * explicit "next step in progress" signal rather than a 404.
 */
export default async function GmailStepPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "setup.gmailStep" });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
        {t("title")}
      </h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("body")}</p>
      <Link href={`/${locale}/app/setup`}>
        <Button variant="outline">{t("back")}</Button>
      </Link>
    </div>
  );
}
