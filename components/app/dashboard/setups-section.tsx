import Link from "next/link";
import { useTranslations } from "next-intl";

import {
  isSetupReSetupEligible,
  setupOverallState,
  type DashboardSetup,
  type SetupOverallState,
} from "@/lib/dashboard-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { StatusBadge } from "./status-badge";

const stateTone: Record<
  SetupOverallState,
  "info" | "warn" | "success" | "danger"
> = {
  in_progress: "info",
  awaiting_verification: "warn",
  done: "success",
  failed: "danger",
};

/**
 * Section: list of the user's domain setups, most recent first.
 * Each row collapses the 14-status enum into a 4-state badge via
 * setupOverallState, and surfaces the right CTA per state:
 *   - failed → "Re-setup this domain"
 *   - done   → "Open" (links into the setup page in case they want
 *               to re-check the wizard's done state)
 *   - else   → "Continue setup" (the wizard picks up from current
 *               state on /app/setup load)
 *
 * The card layout works on both mobile (single column, full-width)
 * and desktop (two-column grid). No table — setups are usually 1-3
 * rows for the MVP, table shape buys nothing here.
 */
export function SetupsSection({
  setups,
  locale,
}: {
  setups: DashboardSetup[];
  locale: string;
}) {
  const t = useTranslations("dashboard.setups");

  if (setups.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-mk-text-primary">
        {t("title")}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {setups.map((setup) => {
          const state = setupOverallState(setup);
          const tone = stateTone[state];
          return (
            <Card key={setup.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-mk-text-primary">
                      {setup.mailboxLocal}@{setup.domain}
                    </p>
                    <p className="mt-0.5 text-xs text-mk-text-tertiary">
                      {t("createdLabel")}:{" "}
                      <time dateTime={setup.createdAt}>
                        {new Date(setup.createdAt).toLocaleDateString(locale)}
                      </time>
                    </p>
                  </div>
                  <StatusBadge tone={tone}>{t(`status.${state}`)}</StatusBadge>
                </div>
                {setup.errorMsg ? (
                  <p
                    className="rounded-md px-3 py-2 text-xs"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      color: "var(--mk-danger)",
                    }}
                  >
                    <span className="font-medium">{t("errorLabel")}:</span>{" "}
                    {setup.errorMsg}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  {isSetupReSetupEligible(setup) ? (
                    <Link href={`/${locale}/app/setup`}>
                      <Button size="sm" variant="default">
                        {t("actions.reSetup")}
                      </Button>
                    </Link>
                  ) : state === "done" ? (
                    <Link href={`/${locale}/app/setup`}>
                      <Button size="sm" variant="outline">
                        {t("actions.open")}
                      </Button>
                    </Link>
                  ) : (
                    <Link href={`/${locale}/app/setup`}>
                      <Button size="sm" variant="default">
                        {t("actions.continue")}
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
