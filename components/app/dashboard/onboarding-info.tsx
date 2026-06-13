import { useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { SiCloudflare, SiGmail } from "react-icons/si";

const CF_MIGRATION_URL =
  "https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/";

/**
 * Two info cards under the empty-state banner — fill the space left by
 * the hidden Delete-account section with the two things a new user
 * actually needs before clicking Start setup: what they get, and the
 * Cloudflare-DNS prerequisite. Same card language as the rest of the
 * dashboard (rounded-xl + mk-border-subtle + surface-elevated), but
 * each leads with an accented icon tile so it reads as a feature, not
 * a grey paragraph.
 */
export function OnboardingInfo() {
  const t = useTranslations("dashboard.onboarding");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* What you'll get */}
      <div className="group relative overflow-hidden rounded-xl border border-mk-border-subtle bg-surface-elevated p-5 transition-colors hover:border-[#EA4335]/40">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgba(234,67,53,0.14), transparent 70%)",
          }}
        />
        <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-[#EA4335]/12 text-[#EA4335]">
          <SiGmail className="size-5" aria-hidden />
        </div>
        <h3 className="text-sm font-semibold text-mk-text-primary">
          {t("getTitle")}
        </h3>
        <p className="mt-1.5 text-sm leading-snug text-mk-text-secondary">
          {t("getBody")}
        </p>
      </div>

      {/* What you need */}
      <div className="group relative overflow-hidden rounded-xl border border-mk-border-subtle bg-surface-elevated p-5 transition-colors hover:border-[#F38020]/40">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(circle, rgba(243,128,32,0.14), transparent 70%)",
          }}
        />
        <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-[#F38020]/12 text-[#F38020]">
          <SiCloudflare className="size-5" aria-hidden />
        </div>
        <h3 className="text-sm font-semibold text-mk-text-primary">
          {t("needTitle")}
        </h3>
        <p className="mt-1.5 text-sm leading-snug text-mk-text-secondary">
          {t("needBody")}
        </p>
        <a
          href={CF_MIGRATION_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-mk-accent underline-offset-2 hover:underline"
        >
          {t("needLinkPrefix")} {t("needLink")}
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}
