import Image from "next/image";
import { useTranslations } from "next-intl";
import { SiCloudflare, SiBrevo } from "react-icons/si";

/**
 * Integrations strip below the hero. Cloudflare and Brevo render from
 * Simple Icons (via react-icons) in their primary brand color. Gmail
 * uses the official multi-color envelope SVG (Wikimedia Commons,
 * 2020 Google brand mark) since users recognize it visually and the
 * single-color Simple Icons wordmark looked off.
 */
export function IntegrationsBar() {
  const t = useTranslations("landing.integrations");
  return (
    <section
      aria-label={t("label")}
      className="w-full border-y border-mk-border-subtle bg-surface-elevated/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-20 sm:px-6 sm:py-24">
        <span className="text-lg font-medium text-mk-text-secondary">
          {t("label")}
        </span>
        <ul className="flex flex-wrap items-center justify-center gap-x-16 gap-y-10 sm:gap-x-20">
          <LogoItem name="Cloudflare">
            <SiCloudflare size={36} color="#F38020" aria-hidden />
          </LogoItem>
          <LogoItem name="Brevo">
            <SiBrevo size={36} color="#0B996E" aria-hidden />
          </LogoItem>
          <LogoItem name="Gmail">
            <Image
              src="/brand/gmail.svg"
              alt=""
              width={36}
              height={28}
              aria-hidden
            />
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
