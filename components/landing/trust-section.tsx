import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Shield, Zap } from "lucide-react";

/**
 * Trust + guarantees — premium-pass refresh per UI_REVIEW_BRIEF §2.8.
 * Two big side-by-side blocks (automation auto-refund + 30-day
 * functional) replace the prior 3-card grid. Architect dropped the
 * "honest about deliverability" card here — its copy now lives in
 * `lib/legal/disclaimer.ts` and renders inside /terms and /guarantee
 * where it has room to breathe. The "we handle tech, you do 3 clicks"
 * marketing line was deleted at the same time per the brief.
 */
export function TrustSection() {
  const t = useTranslations("landing.trust");
  const locale = useLocale();

  return (
    <section id="trust" className="w-full" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="trust-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large max-w-xl text-balance text-mk-text-secondary">
            {t("subhead")}
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2 lg:gap-8">
          <GuaranteeBlock
            icon={<Zap className="size-7 text-mk-accent" aria-hidden />}
            title={t("automation.title")}
            body={t("automation.body")}
            badge={t("automation.badge")}
            badgeKind="success"
          />
          <GuaranteeBlock
            icon={<Shield className="size-7 text-mk-accent" aria-hidden />}
            title={t("functional.title")}
            body={t("functional.body")}
            badge={t("functional.badge")}
            badgeKind="info"
          />
        </div>

        <p className="mt-10 text-center">
          <Link
            href={`/${locale}/guarantee`}
            className="mk-body-small font-medium text-mk-accent underline-offset-4 hover:underline"
          >
            {t("policyLinkLabel")}
          </Link>
        </p>
      </div>
    </section>
  );
}

function GuaranteeBlock({
  icon,
  title,
  body,
  badge,
  badgeKind,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  badge: string;
  badgeKind: "success" | "info";
}) {
  return (
    <article className="flex flex-col gap-5 rounded-2xl border border-mk-border-subtle bg-surface-elevated p-8 mk-card-shadow">
      <div className="flex items-center justify-between gap-4">
        {icon}
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{
            backgroundColor:
              badgeKind === "success"
                ? "rgba(34, 197, 94, 0.12)"
                : "rgba(124, 92, 255, 0.12)",
            color:
              badgeKind === "success"
                ? "var(--mk-success)"
                : "var(--mk-accent)",
          }}
        >
          {badge}
        </span>
      </div>
      <h3 className="mk-heading-2 text-mk-text-primary">{title}</h3>
      <p className="mk-body text-mk-text-secondary">{body}</p>
    </article>
  );
}
