import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { ThemeToggle } from "@/components/theme-toggle";

import { LanguageSwitcher } from "./language-switcher";
import { SignInLink } from "./sign-in-link";

/**
 * Landing header — premium-pass refresh per UI_REVIEW_BRIEF §2.2 + §7.5.
 * 64px tall, monochrome surface tokens, sticky with subtle backdrop-blur.
 *
 * Brand lockup: 24×24 envelope icon (Ideogram Variant 2) + "Mailkit"
 * wordmark @ 18px / weight 600 / -0.02em tracking. Per the §7.5
 * revision the trailing accent dot was removed — it wasn't in the
 * Ideogram source and read as a second accent next to the icon.
 * Icon size dropped from 28→24 so the wordmark stays the visual lead.
 */
export function Header() {
  const t = useTranslations("landing.header");
  const locale = useLocale();
  const landingHref = `/${locale}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-mk-border-subtle bg-surface-base/80 backdrop-blur-md supports-[backdrop-filter]:bg-surface-base/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link
          href={landingHref}
          className="flex items-center gap-2.5 text-mk-text-primary"
          style={{
            fontSize: "18px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
          aria-label={t("logo")}
        >
          <Image
            src="/brand/mailkit-icon.png"
            alt=""
            width={24}
            height={24}
            priority
            className="size-6 shrink-0"
          />
          <span>{t("logo")}</span>
        </Link>

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
