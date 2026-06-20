import { useTranslations } from "next-intl";

import {
  formatMoney,
  purchaseEffectiveStatus,
  type DashboardPurchase,
  type DashboardRefund,
  type PurchaseStatus,
} from "@/lib/dashboard-data";

import { StatusBadge } from "./status-badge";

const statusTone: Record<
  PurchaseStatus,
  "neutral" | "warn" | "success" | "danger"
> = {
  paid: "success",
  refunded: "neutral",
  partially_refunded: "warn",
  fraudulent: "danger",
};

/**
 * Section: purchase history. Hidden when there are no purchases —
 * the empty state is handled by the page-level zero state, not by a
 * "0 purchases" message inside this section.
 *
 * Layout: cards on mobile (one per purchase), table on desktop.
 * Both sources off the same data, the breakpoint is the only switch.
 */
export function PurchasesSection({
  purchases,
  refunds,
}: {
  purchases: DashboardPurchase[];
  refunds: DashboardRefund[];
}) {
  const t = useTranslations("dashboard.purchases");

  if (purchases.length === 0) return null;

  const refundLite = refunds.map((r) => ({
    purchaseId: r.purchaseId,
    amountCents: r.amountCents,
  }));

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
                {t("tableHeaders.domain")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("tableHeaders.amount")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("tableHeaders.status")}
              </th>
              <th className="px-4 py-2 font-medium">
                {t("tableHeaders.orderId")}
              </th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => {
              const effective = purchaseEffectiveStatus(p, refundLite);
              return (
                <tr
                  key={p.id}
                  className="border-t border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                >
                  <td className="px-4 py-3">
                    <time dateTime={p.createdAt}>
                      {new Date(p.createdAt).toLocaleDateString("en", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </td>
                  <td className="px-4 py-3">{p.domain ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatMoney(p.amountCents, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge tone={statusTone[effective]}>
                        {t(`status.${effective}`)}
                      </StatusBadge>
                      {p.testMode ? (
                        <StatusBadge tone="neutral">
                          {t("testModeBadge")}
                        </StatusBadge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.lsOrderId}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 sm:hidden">
        {purchases.map((p) => {
          const effective = purchaseEffectiveStatus(p, refundLite);
          return (
            <li
              key={p.id}
              className="space-y-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-mk-text-primary">
                    {formatMoney(p.amountCents, p.currency)}
                  </p>
                  <p className="text-xs text-mk-text-tertiary">
                    <time dateTime={p.createdAt}>
                      {new Date(p.createdAt).toLocaleDateString("en", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  <StatusBadge tone={statusTone[effective]}>
                    {t(`status.${effective}`)}
                  </StatusBadge>
                  {p.testMode ? (
                    <StatusBadge tone="neutral">
                      {t("testModeBadge")}
                    </StatusBadge>
                  ) : null}
                </div>
              </div>
              <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-mk-text-tertiary">
                  {t("tableHeaders.domain")}
                </dt>
                <dd className="text-mk-text-secondary">{p.domain ?? "—"}</dd>
                <dt className="text-mk-text-tertiary">
                  {t("tableHeaders.orderId")}
                </dt>
                <dd className="font-mono text-mk-text-secondary">
                  {p.lsOrderId}
                </dd>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
