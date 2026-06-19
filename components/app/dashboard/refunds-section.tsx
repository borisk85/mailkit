import { useTranslations } from "next-intl";

import { formatMoney, type DashboardRefund } from "@/lib/dashboard-data";

/**
 * Section: refund history. Hidden when there are no refunds — most
 * users will never see this. The audit-log nature is intentional: if
 * the auto-refund flow wrote an LS_CALL_FAILED row (amount=0), it
 * shows up here too so the user has visibility into the trail.
 */
export function RefundsSection({ refunds }: { refunds: DashboardRefund[] }) {
  const t = useTranslations("dashboard.refunds");

  if (refunds.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="mk-eyebrow text-mk-text-tertiary">{t("title")}</h2>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-lg border border-zinc-200 sm:block dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-2 font-medium">
                {t("tableHeaders.date")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("tableHeaders.amount")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("tableHeaders.reason")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("tableHeaders.triggeredBy")}
              </th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr
                key={r.id}
                className="border-t border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
              >
                <td className="px-4 py-3">
                  <time dateTime={r.createdAt}>
                    {new Date(r.createdAt).toLocaleDateString("en")}
                  </time>
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {formatMoney(r.amountCents, r.currency)}
                </td>
                <td className="px-4 py-3">{translateReason(t, r.reason)}</td>
                <td className="px-4 py-3">
                  {translateTriggeredBy(t, r.triggeredBy)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 sm:hidden">
        {refunds.map((r) => (
          <li
            key={r.id}
            className="space-y-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-mk-text-primary">
                {formatMoney(r.amountCents, r.currency)}
              </span>
              <time
                dateTime={r.createdAt}
                className="text-xs text-mk-text-tertiary"
              >
                {new Date(r.createdAt).toLocaleDateString("en")}
              </time>
            </div>
            <p className="text-xs text-mk-text-secondary">
              {translateReason(t, r.reason)} ·{" "}
              {translateTriggeredBy(t, r.triggeredBy)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Translator = (key: string) => string;

function translateReason(t: Translator, reason: string): string {
  const known = [
    "automation_failure",
    "functional_30day_request",
    "fraud_dispute",
    "manual_support_discretion",
  ];
  return known.includes(reason) ? t(`reason.${reason}`) : reason;
}

function translateTriggeredBy(t: Translator, triggeredBy: string): string {
  const known = ["system", "support", "user_dispute"];
  return known.includes(triggeredBy)
    ? t(`triggeredBy.${triggeredBy}`)
    : triggeredBy;
}
