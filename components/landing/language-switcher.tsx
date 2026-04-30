"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import GB from "country-flag-icons/react/3x2/GB";
import RU from "country-flag-icons/react/3x2/RU";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const t = useTranslations("landing.header.languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const FlagForLocale = ({ l }: { l: string }) => {
    if (l === "en") return <GB className="h-3.5 w-auto rounded-sm" />;
    if (l === "ru") return <RU className="h-3.5 w-auto rounded-sm" />;
    return null;
  };

  const labelForLocale = (l: string) =>
    l === "en" ? t("en") : l === "ru" ? t("ru") : l.toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("label")}
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-mk-text-tertiary transition-colors hover:text-mk-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-accent/40"
      >
        <Globe className="size-3.5" aria-hidden />
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
              <span className="flex items-center gap-2">
                <span aria-hidden>
                  <FlagForLocale l={l} />
                </span>
                {labelForLocale(l)}
              </span>
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
