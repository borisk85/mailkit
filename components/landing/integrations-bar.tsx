import Image from "next/image";
import { useTranslations } from "next-intl";
import { SiCloudflare, SiBrevo } from "react-icons/si";

/**
 * Integrations strip below the hero. Cloudflare and Brevo render from
 * Simple Icons (via react-icons) in their primary brand color. Gmail
 * uses the official multi-color envelope SVG (Wikimedia Commons,
 * 2020 Google brand mark) since users recognize it visually and the
 * single-color Simple Icons wordmark looked off.
 *
 * Layout: inline horizontal — label on the left, vertical divider,
 * brand row on the right. Brand name labels are secondary-tone so
 * they don't compete with the primary "Работает на" heading.
 */
export function IntegrationsBar() {
  const t = useTranslations("landing.integrations");
  return (
    <section
      aria-label={t("label")}
      className="w-full border-y border-mk-border-subtle bg-surface-elevated/40"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-6 px-4 py-8 sm:px-6 sm:py-10">
        <span className="text-base font-semibold uppercase tracking-[0.2em] text-mk-accent">
          {t("label")}
        </span>
        <ul className="flex flex-1 flex-wrap items-center justify-end gap-x-10 gap-y-6 sm:gap-x-14">
          <LogoItem name="Cloudflare">
            <SiCloudflare size={28} color="#F38020" aria-hidden />
          </LogoItem>
          <LogoItem name="Brevo">
            <SiBrevo size={28} color="#0B996E" aria-hidden />
          </LogoItem>
          <LogoItem name="Gmail">
            <Image
              src="/brand/gmail.svg"
              alt=""
              width={28}
              height={22}
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
      <span aria-label={name} className="inline-flex items-center gap-2.5">
        {children}
        <span className="text-xl font-medium tracking-tight text-mk-text-secondary">
          {name}
        </span>
      </span>
    </li>
  );
}
