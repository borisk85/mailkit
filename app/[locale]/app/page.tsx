import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { AccountSection } from "@/components/app/dashboard/account-section";
import { DashboardEmptyState } from "@/components/app/dashboard/empty-state";
import { PurchasesSection } from "@/components/app/dashboard/purchases-section";
import { RefundsSection } from "@/components/app/dashboard/refunds-section";
import { ResourcesSection } from "@/components/app/dashboard/resources-section";
import { SetupsSection } from "@/components/app/dashboard/setups-section";
import { getDashboardData, type DashboardData } from "@/lib/dashboard-data";
import { createClient } from "@/lib/supabase/server";
import { mockDashboardForFixture } from "@/lib/dashboard-mock";

/**
 * /app dashboard. Server component — all reads happen here, sections
 * render server-side, only the delete-confirm modal escapes to a
 * client island in AccountSection.
 *
 * Sections:
 *   - Setups (hidden if 0)
 *   - Purchases (hidden if 0)
 *   - Refunds (hidden if 0)
 *   - Account (always visible — profile + delete)
 *   - Resources (always visible — legal links + support)
 *
 * If both Setups and Purchases are empty, we show the friendly
 * empty-state CTA above Account/Resources instead of a sea of empty
 * sections.
 */
export default async function AppHome({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "dashboard" });
  const tAuth = await getTranslations({ locale, namespace: "auth" });

  // Preview-mode bypass: parent layout sets x-mailkit-mock=1 when
  // ?mock= is present and we're in non-prod. Lets the dashboard be
  // exercised in Playwright and live preview without a Google
  // account. Production hard-disables this in proxy.ts.
  const h = await headers();
  const isMockPreview = h.get("x-mailkit-mock") === "1";

  let displayName: string;
  let displayEmail: string;
  let fullName: string | null;
  let data: DashboardData;

  if (isMockPreview) {
    const fixtureKey = readParam(sp.mock) ?? "default";
    const mock = mockDashboardForFixture(fixtureKey);
    displayName = mock.profile.fullName ?? tAuth("friendFallback");
    displayEmail = mock.profile.email;
    fullName = mock.profile.fullName;
    data = mock.data;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      // Defensive — the parent layout already gates auth, but if
      // anyone reaches this page without a session they go to landing.
      redirect(`/${locale}`);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    displayName = profile?.full_name ?? tAuth("friendFallback");
    displayEmail = profile?.email ?? user.email ?? "";
    fullName = profile?.full_name ?? null;
    data = await getDashboardData(supabase, user.id);
  }

  const isEmpty = data.setups.length === 0 && data.purchases.length === 0;

  // Step 3 wires the real server action; for step 2 the modal calls a
  // resolved-noop so the UI is exercisable in Playwright snapshots
  // without yet performing the destructive DB write.
  const deleteAccountStub = async () => {
    "use server";
    return;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          {t("title", { name: displayName })}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("subtitle")}
        </p>
      </header>

      {isEmpty ? (
        <DashboardEmptyState locale={locale} />
      ) : (
        <>
          <SetupsSection setups={data.setups} locale={locale} />
          <PurchasesSection
            purchases={data.purchases}
            refunds={data.refunds}
            locale={locale}
          />
          <RefundsSection refunds={data.refunds} locale={locale} />
        </>
      )}

      <AccountSection
        email={displayEmail}
        fullName={fullName}
        locale={locale}
        deleteAction={deleteAccountStub}
      />

      <ResourcesSection locale={locale} />
    </div>
  );
}

function readParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
