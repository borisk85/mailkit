"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * Language switcher — shadcn DropdownMenu trigger + two items (EN/RU).
 * Replaces the pre-#11 pill-toggle design per LANDING_SPEC_V1.md
 * section 9.5 — cleaner at header density, room for a third locale
 * later without layout pressure.
 */
export function LanguageSwitcher() {
  const t = useTranslations("landing.header.languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const labelForLocale = (l: string) =>
    l === "en" ? t("en") : l === "ru" ? t("ru") : l.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("label")}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 dark:focus-visible:ring-neutral-500"
      >
        <Globe className="size-4" aria-hidden />
        <span className="uppercase">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {routing.locales.map((l) => {
          const active = l === locale;
          return (
            <DropdownMenuItem
              key={l}
              onClick={() => {
                if (!active) router.replace(pathname, { locale: l });
              }}
              className="flex items-center justify-between"
            >
              <span>{labelForLocale(l)}</span>
              {active ? (
                <Check className="size-4 text-neutral-500" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
