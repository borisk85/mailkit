import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

export async function AddAnotherCard({ locale }: { locale: string }) {
  const t = await getTranslations({
    locale,
    namespace: "dashboard.addAnother",
  });

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-dashed border-mk-border-subtle bg-surface-elevated p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-mk-text-primary">{t("title")}</p>
        <p className="mt-0.5 text-sm text-mk-text-secondary">{t("body")}</p>
      </div>
      <Link href="/api/checkout/start" className="shrink-0">
        <Button size="sm" variant="outline">
          {t("cta")}
        </Button>
      </Link>
    </section>
  );
}
