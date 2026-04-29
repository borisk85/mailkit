import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { MailkitIcon } from "@/components/brand/mailkit-icon";
import { ThemeToggle } from "@/components/theme-toggle";

import { LanguageSwitcher } from "./language-switcher";
import { LogoLink } from "./logo-link";
import { SignInLink } from "./sign-in-link";

/**
 * Landing header — premium-pass refresh per UI_REVIEW_BRIEF §2.2 + §7.5,
 * with Design V2 §4.2 polish (sign-in icon affordance, inline-SVG mark,
 * `Mailkit` casing).
 *
 * Brand lockup: 24×24 inline-SVG envelope (matches the Ideogram
 * source, but scales without raster blur on retina) + `Mailkit`
 * wordmark @ 18 px / weight 600 / -0.02em tracking. No trailing
 * accent dot.
 */
export function Header() {
  const t = useTranslations("landing.header");
  const locale = useLocale();
  const landingHref = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-mk-border-subtle bg-surface-base/80 shadow-[0_1px_0_rgba(0,0,0,0.4)] backdrop-blur-md supports-[backdrop-filter]:bg-surface-base/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <LogoLink
          href={landingHref}
          className="flex items-center gap-2.5 text-mk-text-primary"
          style={{
            fontSize: "18px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
          aria-label={t("logo")}
        >
          <MailkitIcon className="size-6 shrink-0" />
          <span>{t("logo")}</span>
        </LogoLink>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          <Link
            href={`${landingHref}#how-it-works`}
            className="text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            {t("nav.howItWorks")}
          </Link>
          <Link
            href={`${landingHref}#pricing`}
            className="text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href={`${landingHref}#faq`}
            className="text-sm font-medium text-mk-text-secondary transition-colors hover:text-mk-text-primary"
          >
            {t("nav.faq")}
          </Link>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <div className="mx-1 h-5 w-px bg-mk-border-subtle sm:mx-2" />
          <SignInLink />
        </div>
      </div>
    </header>
  );
}
