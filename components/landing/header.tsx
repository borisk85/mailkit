import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { ThemeToggle } from "@/components/theme-toggle";

import { LanguageSwitcher } from "./language-switcher";
import { SignInLink } from "./sign-in-link";

/**
 * Landing header — Vercel-pattern minimal nav (logo + anchor nav +
 * language switcher + theme toggle + sign in). Sticky at the top
 * with backdrop-blur (Linear-style) so scrolled content passes
 * behind without drowning out the nav.
 *
 * Mount order in app/[locale]/page.tsx: AnnouncementBanner sits
 * above Header — so the sticky header clamps to the top only after
 * the banner scrolls past (or is dismissed).
 *
 * Cross-page anchors: nav links use full path + hash
 * (`/{locale}#how-it-works`) instead of bare `#how-it-works`. That
 * way a click on /terms or /privacy routes back to the landing and
 * jumps to the right section, instead of silently no-op'ing on a
 * page where the anchor doesn't exist.
 *
 * The brand lockup pairs the envelope icon
 * (`/brand/mailkit-icon.png`) with the "Mailkit" wordmark and the
 * indigo accent dot from the etap 1 design language.
 */
export function Header() {
  const t = useTranslations("landing.header");
  const locale = useLocale();
  const landingHref = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/70 bg-neutral-50/70 backdrop-blur-md supports-[backdrop-filter]:bg-neutral-50/60 dark:border-neutral-800/70 dark:bg-neutral-950/70 dark:supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href={landingHref}
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-neutral-950 dark:text-neutral-50"
          aria-label={t("logo")}
        >
          <Image
            src="/brand/mailkit-icon.png"
            alt=""
            width={28}
            height={28}
            priority
            className="size-7 shrink-0"
          />
          <span>{t("logo")}</span>
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-indigo-500"
          />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-6 text-sm font-medium md:flex"
        >
          <Link
            href={`${landingHref}#how-it-works`}
            className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t("nav.howItWorks")}
          </Link>
          <Link
            href={`${landingHref}#pricing`}
            className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href={`${landingHref}#faq`}
            className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t("nav.faq")}
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-800 sm:mx-2" />
          <SignInLink />
        </div>
      </div>
    </header>
  );
}
