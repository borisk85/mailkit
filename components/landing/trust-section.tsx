import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Check, Shield, Zap } from "lucide-react";

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
  const objections = t.raw("objections") as string[];

  return (
    <section id="trust" className="w-full" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-30 lg:py-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="mk-eyebrow text-mk-accent">{t("eyebrow")}</span>
          <h2
            id="trust-heading"
            className="mk-display-2 text-balance text-mk-text-primary"
          >
            {t("heading")}
          </h2>
          <p className="mk-body-large max-w-xl text-mk-text-secondary">
            {t("subhead")}
          </p>
          <Link
            href={`/${locale}/guarantee`}
            className="mk-caption inline-flex items-center gap-2 rounded-full border border-mk-border-strong bg-surface-elevated/60 px-3 py-1 text-mk-text-secondary transition-colors hover:bg-surface-elevated hover:text-mk-text-primary"
          >
            <Shield className="size-3" aria-hidden />
            {t("policyPill")}
          </Link>
          <p className="text-xs text-mk-text-tertiary">{t("audienceNote")}</p>
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

        <ul className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
          {objections.map((item) => (
            <li
              key={item}
              className="inline-flex items-start gap-2 rounded-full border border-mk-border-subtle bg-surface-elevated/60 px-4 py-2 text-sm text-mk-text-secondary"
            >
              <Check
                className="mt-0.5 size-3.5 shrink-0 text-mk-accent"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center">
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
    <article className="flex flex-col gap-5 rounded-2xl border border-mk-border-subtle bg-surface-elevated-2 p-8 mk-card-shadow-strong">
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
