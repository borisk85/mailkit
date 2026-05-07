import Link from "next/link";
import { useTranslations } from "next-intl";

import { MailkitIcon } from "@/components/brand/mailkit-icon";

/**
 * Landing footer — Design V2 §4.11 trim of the V1 5-column grid.
 * The Resources column (forward-dated /help, /status, /changelog
 * placeholders) is gone until those pages exist; current layout is
 * Brand × 2 + Product + Legal + Contact = 4 effective columns.
 *
 * The Contact column carries a `Built in public — GitHub →` link so
 * skeptics can verify the codebase — concrete trust signal that
 * reinforces the indie-founder positioning in the tagline.
 */
const GITHUB_URL = "https://github.com/borisk85/mailkit";

export function Footer() {
  const t = useTranslations("footer");
  const landingHref = "/";

  return (
    <footer className="w-full border-t border-mk-border-subtle bg-surface-elevated">
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pb-20">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-2">
            <Link
              href={landingHref}
              className="flex items-center gap-2.5 text-mk-text-primary"
              style={{
                fontSize: "16px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
              }}
            >
              <MailkitIcon className="size-7 shrink-0" />
              <span>Mailkit</span>
            </Link>
            <p className="mk-body-small mt-4 max-w-xs text-mk-text-tertiary">
              {t("tagline")}
            </p>
            <p className="mk-caption mt-6 text-mk-text-tertiary">
              {t("copyright")}
            </p>
          </div>

          <FooterColumn heading={t("productHeading")}>
            <FooterLink href={`${landingHref}#how-it-works`}>
              {t("links.howItWorks")}
            </FooterLink>
            <FooterLink href={`${landingHref}#pricing`}>
              {t("links.pricing")}
            </FooterLink>
            <FooterLink href={`${landingHref}#faq`}>
              {t("links.faq")}
            </FooterLink>
            <FooterLink href="/app">{t("links.signIn")}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={t("legalHeading")}>
            <FooterLink href="/terms">{t("links.terms")}</FooterLink>
            <FooterLink href="/privacy">{t("links.privacy")}</FooterLink>
            <FooterLink href="/guarantee">{t("links.guarantee")}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={t("contactHeading")}>
            <FooterLink href="mailto:support@getmailkit.com" external breakAll>
              {t("links.supportEmail")}
            </FooterLink>
            <FooterLink href={GITHUB_URL} external>
              {t("links.builtInPublic")}
            </FooterLink>
          </FooterColumn>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="mk-eyebrow text-mk-text-tertiary">{heading}</h3>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
  external,
  breakAll,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  breakAll?: boolean;
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          className={`mk-body-small text-mk-text-secondary transition-colors hover:text-mk-text-primary${breakAll ? " break-all" : ""}`}
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="mk-body-small text-mk-text-secondary transition-colors hover:text-mk-text-primary"
      >
        {children}
      </Link>
    </li>
  );
}
