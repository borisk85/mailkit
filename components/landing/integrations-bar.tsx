import { useTranslations } from "next-intl";
import { SiCloudflare, SiBrevo, SiGmail } from "react-icons/si";

/**
 * Tech-stack strip below the hero — three official brand-color marks
 * sourced from Simple Icons (via react-icons). Each icon is the
 * canonical brand silhouette in the brand's primary color, so we don't
 * ship hand-rolled approximations. No hover, no description text.
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
            <SiCloudflare size={36} color="#F38020" aria-hidden />
          </LogoItem>
          <LogoItem name="Brevo">
            <SiBrevo size={36} color="#0B996E" aria-hidden />
          </LogoItem>
          <LogoItem name="Gmail">
            <SiGmail size={36} color="#EA4335" aria-hidden />
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
