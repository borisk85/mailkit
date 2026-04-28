import { useTranslations } from "next-intl";

/**
 * Tech-stack strip below the hero — three brand-colored marks at large
 * size: Cloudflare, Brevo, Gmail. Brand colors signal credibility (vs
 * the prior gray monochrome that read as filler). No hover, no
 * description text — purely a logo bar.
 */
export function IntegrationsBar() {
  const t = useTranslations("landing.integrations");
  return (
    <section
      aria-label={t("label")}
      className="w-full border-y border-mk-border-subtle bg-surface-elevated/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-20 sm:px-6 sm:py-24">
        <span className="mk-eyebrow text-mk-text-tertiary">{t("label")}</span>
        <ul className="flex flex-wrap items-center justify-center gap-x-16 gap-y-10 sm:gap-x-20">
          <LogoItem name="Cloudflare">
            <CloudflareMark />
          </LogoItem>
          <LogoItem name="Brevo">
            <BrevoMark />
          </LogoItem>
          <LogoItem name="Gmail">
            <GmailMark />
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
        className="inline-flex items-center gap-3 text-mk-text-primary"
      >
        {children}
        <span className="text-2xl font-semibold tracking-tight">{name}</span>
      </span>
    </li>
  );
}

function CloudflareMark() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden>
      <path
        fill="#F38020"
        d="M16.5 13.2c.1-.4 0-.8-.2-1.1-.2-.3-.6-.4-1-.5l-7.7-.1c-.1 0-.1 0-.2-.1 0-.1 0-.1.1-.2 0-.1.1-.1.2-.1l7.8-.1c.9 0 1.9-.8 2.3-1.7l.5-1.2c0-.1 0-.1 0-.2-.5-2.5-2.7-4.3-5.3-4.3-2.4 0-4.5 1.6-5.2 3.7-.5-.4-1.1-.5-1.7-.5-1.2.1-2.2 1.1-2.3 2.3-.1.3 0 .6.1.9-2 .1-3.5 1.7-3.5 3.7 0 .2 0 .4 0 .5 0 .1.1.2.2.2H16c.1 0 .2-.1.3-.2l.2-.9z"
      />
      <path
        fill="#FAAD3F"
        d="M19.4 8.7h-.2c-.1 0-.1.1-.1.1l-.3 1.2c-.1.4 0 .8.2 1.1.2.3.6.4 1 .5l1.6.1c.1 0 .1 0 .2.1 0 .1 0 .1-.1.2 0 .1-.1.1-.2.1l-1.7.1c-.9 0-1.9.8-2.3 1.7l-.1.4c0 .1 0 .1.1.2H23c.1 0 .2-.1.2-.2.1-.4.2-.9.2-1.4 0-2.3-1.9-4.2-4-4.2z"
      />
    </svg>
  );
}

function BrevoMark() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#0B996E" />
      <path
        fill="#FFFFFF"
        d="M8.4 17.4V6.6h3.7c1 0 1.8.2 2.4.5.7.3 1.1.8 1.4 1.4.3.6.5 1.2.5 1.9 0 .6-.1 1.2-.4 1.6-.3.5-.7.8-1.2 1 .6.2 1.1.5 1.4 1 .3.5.5 1.1.5 1.7 0 .7-.2 1.3-.5 1.9-.4.6-.9 1-1.5 1.3-.7.3-1.5.5-2.5.5h-3.8zm2.2-6.4h1.6c.5 0 .9-.1 1.1-.4.3-.2.4-.6.4-1s-.1-.7-.4-1c-.3-.2-.7-.4-1.2-.4h-1.5v2.8zm0 4.6h1.7c.6 0 1-.1 1.3-.4.3-.3.5-.6.5-1.1s-.2-.8-.5-1.1c-.3-.3-.8-.4-1.4-.4h-1.6v3z"
      />
    </svg>
  );
}

function GmailMark() {
  return (
    <svg viewBox="0 0 24 24" width="36" height="36" aria-hidden>
      <path fill="#4285F4" d="M2 6.4v11.4c0 .5.4.9.9.9H5V9.9L2 6.4z" />
      <path fill="#34A853" d="M19 18.7h2.1c.5 0 .9-.4.9-.9V6.4l-3 3.5v8.8z" />
      <path fill="#FBBC04" d="m19 6.4-7 5.2-7-5.2v3.5l7 5.2 7-5.2V6.4z" />
      <path
        fill="#EA4335"
        d="M5 6.4 12 11.6l7-5.2c0-.7-.5-1.2-1.2-1.2H6.2C5.5 5.2 5 5.7 5 6.4z"
      />
    </svg>
  );
}
