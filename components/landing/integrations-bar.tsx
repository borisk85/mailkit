import { useTranslations } from "next-intl";

/**
 * Stripe-style "Integrates with" bar, mounted directly below the hero
 * per LANDING_SPEC_V1.md section 9.2. Trust signal + tech transparency
 * before the user scrolls into the problem / how-it-works detail.
 *
 * For v1 the three "logos" are wordmarks — brand-neutral rendering
 * with tinted color hints (Cloudflare orange, Brevo teal, Gmail red),
 * zero external asset fetches, zero client JS. If we want pixel-
 * accurate brand marks post-launch they swap into the same three
 * slots.
 */
export function IntegrationsBar() {
  const t = useTranslations("landing.integrations");
  return (
    <section
      aria-label={t("label")}
      className="w-full border-y border-neutral-200 bg-neutral-100/60 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-8 sm:flex-row sm:justify-center sm:gap-10 sm:px-6">
        <span className="text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
          {t("label")}
        </span>
        <ul className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
          <li>
            <IntegrationMark
              name="Cloudflare"
              colorClass="text-[#F38020] dark:text-[#F6821F]"
            />
          </li>
          <li>
            <IntegrationMark
              name="Brevo"
              colorClass="text-[#0B996E] dark:text-[#13B17E]"
            />
          </li>
          <li>
            <IntegrationMark
              name="Gmail"
              colorClass="text-[#D93025] dark:text-[#E95D54]"
            />
          </li>
        </ul>
      </div>
    </section>
  );
}

function IntegrationMark({
  name,
  colorClass,
}: {
  name: string;
  colorClass: string;
}) {
  return (
    <span
      className={`text-lg font-semibold tracking-tight ${colorClass}`}
      aria-label={name}
    >
      {name}
    </span>
  );
}
