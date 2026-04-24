import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { LanguageSwitcher } from "./language-switcher";

/**
 * Pre-#11 landing header. Shows the new brand lockup — envelope icon
 * (PNG, cropped from /public/brand/mailkit-logo-full.png) + "Mailkit"
 * wordmark — and the language switcher. Picked up on main so the
 * current prod landing reflects the brand refresh without waiting for
 * the #11 redesign to resume.
 *
 * When feat/ticket-11-landing resumes, the rewritten Header component
 * in that branch takes over — this file will be superseded there with
 * the full Linear-pattern nav. For now the logo swap + wordmark live
 * here to unblock the brand rollout.
 */
export function Header() {
  const t = useTranslations("header");
  const locale = useLocale();
  return (
    <header className="flex w-full items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
      <Link
        href={`/${locale}`}
        className="flex items-center gap-2 text-zinc-950 transition-opacity hover:opacity-80 dark:text-zinc-50"
        aria-label={t("logo")}
      >
        <Image
          src="/brand/mailkit-icon.png"
          alt=""
          width={32}
          height={32}
          priority
          className="size-8 shrink-0"
        />
        <span className="text-xl font-bold tracking-tight">{t("logo")}</span>
      </Link>
      <LanguageSwitcher />
    </header>
  );
}
