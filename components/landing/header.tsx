import { useTranslations } from "next-intl";

import { LanguageSwitcher } from "./language-switcher";

export function Header() {
  const t = useTranslations("header");
  return (
    <header className="flex w-full items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <div className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {t("logo")}
      </div>
      <LanguageSwitcher />
    </header>
  );
}
