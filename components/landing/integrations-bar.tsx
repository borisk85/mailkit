import Image from "next/image";
import { useTranslations } from "next-intl";
import { SiCloudflare } from "react-icons/si";
import { HiMail } from "react-icons/hi";

/**
 * Integrations strip below the hero. Cloudflare uses Simple Icons brand color.
 * Postmark uses a generic mail icon (SiPostmark absent in react-icons 5.6.0 —
 * upgrade to react-icons ≥5.7 or use Postmark brand SVG when available).
 * Gmail uses the official multi-color envelope SVG (Wikimedia Commons,
 * 2020 Google brand mark) since users recognize it visually.
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
      <ul className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-y-8 px-4 py-10 sm:flex-row sm:gap-x-16 sm:gap-y-0 sm:px-6 sm:py-12">
        <LogoItem name="Cloudflare">
          <SiCloudflare size={40} color="#F38020" aria-hidden />
        </LogoItem>
        <LogoItem name="Postmark">
          <HiMail size={40} color="#FFDE00" aria-hidden />
        </LogoItem>
        <LogoItem name="Gmail">
          <Image
            src="/brand/gmail.svg"
            alt=""
            width={40}
            height={32}
            aria-hidden
          />
        </LogoItem>
      </ul>
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
