import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

/**
 * Landing footer — premium-pass refresh per UI_REVIEW_BRIEF §2.11.
 * 5-column grid on desktop (brand / Product / Legal / Resources /
 * Contact), stacked on mobile. Resources column carries forward-
 * dated links (status, changelog, help) — they 404 today, the
 * architect's call is to render the structure now and fill the pages
 * post-launch instead of churning footer markup later.
 */
export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const landingHref = `/${locale}`;

  return (
    <footer className="w-full border-t border-mk-border-subtle bg-surface-elevated">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
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
              <Image
                src="/brand/mailkit-icon.png"
                alt=""
                width={28}
                height={28}
                className="size-7 shrink-0"
              />
              <span>MailKit</span>
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
            <FooterLink href={`/${locale}/app`}>{t("links.signIn")}</FooterLink>
          </FooterColumn>

          <FooterColumn heading={t("legalHeading")}>
            <FooterLink href={`/${locale}/terms`}>
              {t("links.terms")}
            </FooterLink>
            <FooterLink href={`/${locale}/privacy`}>
              {t("links.privacy")}
            </FooterLink>
            <FooterLink href={`/${locale}/guarantee`}>
              {t("links.guarantee")}
            </FooterLink>
          </FooterColumn>

          <FooterColumn heading={t("resourcesHeading")}>
            <FooterPending>{t("links.help")}</FooterPending>
            <FooterPending>{t("links.status")}</FooterPending>
            <FooterPending>{t("links.changelog")}</FooterPending>
          </FooterColumn>

          <FooterColumn heading={t("contactHeading")}>
            <FooterLink href="mailto:support@getmailkit.com" external>
              {t("links.supportEmail")}
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

function FooterPending({ children }: { children: React.ReactNode }) {
  return <li className="mk-body-small text-mk-text-tertiary/60">{children}</li>;
}

function FooterLink({
  href,
  children,
  external,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <li>
        <a
          href={href}
          className="mk-body-small text-mk-text-secondary transition-colors hover:text-mk-text-primary"
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
