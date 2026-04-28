import { useTranslations } from "next-intl";
import { Cloud } from "lucide-react";

/**
 * Logos bar — premium-pass refresh per UI_REVIEW_BRIEF §2.4. Five
 * monochrome wordmarks (Cloudflare, Brevo, Gmail, Google OAuth,
 * Lemon Squeezy) below the hero. Architect dropped the colored
 * brand-marks because color collides with the new monochrome surface
 * — text-tertiary tone with a slight lift on hover.
 *
 * The marks are all-text plus one outline glyph (Cloudflare cloud,
 * Brevo monogram, Gmail envelope) — zero brand-asset fetches, no
 * trademark-rendering risk.
 */
export function IntegrationsBar() {
  const t = useTranslations("landing.integrations");
  return (
    <section
      aria-label={t("label")}
      className="w-full border-t border-mk-border-subtle"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 sm:px-6 lg:py-32">
        <span className="mk-eyebrow text-mk-text-tertiary">{t("label")}</span>
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 sm:gap-x-16">
          <LogoItem name="Cloudflare">
            <Cloud className="size-5" aria-hidden strokeWidth={1.75} />
          </LogoItem>
          <LogoItem name="Brevo">
            <BrevoMark />
          </LogoItem>
          <LogoItem name="Gmail">
            <GmailMark />
          </LogoItem>
          <LogoItem name="Google OAuth">
            <GoogleMark />
          </LogoItem>
          <LogoItem name="Lemon Squeezy">
            <LemonMark />
          </LogoItem>
        </ul>
      </div>
    </section>
  );
}

function LogoItem({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <span
        aria-label={name}
        className="group inline-flex h-8 items-center gap-2 text-mk-text-secondary transition-all hover:-translate-y-0.5 hover:text-mk-text-primary"
      >
        {children}
        <span className="text-base font-semibold tracking-tight">{name}</span>
      </span>
    </li>
  );
}

function BrevoMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4h9a4 4 0 0 1 0 8H8" />
      <path d="M5 12h11a4 4 0 0 1 0 8H5z" />
    </svg>
  );
}

function GmailMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5a7 7 0 1 0 6.93 8" />
      <path d="M12 12h7" />
    </svg>
  );
}

function LemonMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 14a7 7 0 0 1 9-9l5 5a7 7 0 0 1-9 9z" />
      <path d="M5 14 3 16" />
      <path d="m21 8 2-2" />
    </svg>
  );
}
