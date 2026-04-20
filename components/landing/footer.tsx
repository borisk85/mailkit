import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="flex w-full flex-col items-center justify-between gap-2 border-t border-zinc-200 px-6 py-6 text-xs text-zinc-500 sm:flex-row dark:border-zinc-800">
      <span>{t("tagline")}</span>
      <span>{t("copyright")}</span>
    </footer>
  );
}
