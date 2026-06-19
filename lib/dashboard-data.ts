import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-messages";
import {
  currentWindowBuckets,
  DEFAULT_SEND_LIMITS,
  type WindowType,
} from "@/lib/send-limits";

// Re-export shared types and pure functions so existing importers that
// reference "@/lib/dashboard-data" keep working without change.
export type {
  SetupStatus,
  PurchaseStatus,
  DashboardSetup,
  DashboardPurchase,
  DashboardRefund,
  SendUsage,
  DashboardData,
  SetupOverallState,
} from "@/lib/dashboard-types";
export {
  setupOverallState,
  isSetupReSetupEligible,
  setupDetailLabel,
  formatMoney,
  purchaseEffectiveStatus,
} from "@/lib/dashboard-types";

import {
  type SetupStatus,
  type PurchaseStatus,
  type DashboardData,
  type SendUsage,
} from "@/lib/dashboard-types";

type SsrClient = Awaited<ReturnType<typeof createClient>>;

export async function getDashboardData(
  supabase: SsrClient,
  userId: string,
): Promise<DashboardData> {
  const now = new Date();
  const buckets = currentWindowBuckets(now);

  const [setupsRes, purchasesRes, refundsRes] = await Promise.all([
    supabase
      .from("setup_runs")
      .select(
        "id, domain, mailbox_local, status, error_msg, created_at, updated_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("purchases")
      .select(
        "id, amount_cents, currency, status, ls_order_id, ls_order_identifier, custom_data, test_mode, created_at, refunded_at, suspended_at, suspension_reason",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("refunds")
      .select(
        "id, purchase_id, amount_cents, currency, reason, triggered_by, notes, created_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  const setupsRaw = (setupsRes.data ?? []) as Array<{
    id: string;
    domain: string;
    mailbox_local: string;
    status: SetupStatus;
    error_msg: string | null;
    created_at: string;
    updated_at: string;
  }>;
  const purchasesRaw = (purchasesRes.data ?? []) as Array<{
    id: string;
    amount_cents: number;
    currency: string;
    status: PurchaseStatus;
    ls_order_id: string;
    ls_order_identifier: string | null;
    custom_data: Record<string, unknown> | null;
    test_mode: boolean;
    created_at: string;
    refunded_at: string | null;
    suspended_at: string | null;
    suspension_reason: string | null;
  }>;
  const refundsRaw = (refundsRes.data ?? []) as Array<{
    id: string;
    purchase_id: string;
    amount_cents: number;
    currency: string;
    reason: string;
    triggered_by: string;
    notes: string | null;
    created_at: string;
  }>;

  // One card per mailbox address: keep only the most recent setup run per
  // domain+mailbox pair. Older attempts (failed or otherwise) are noise.
  const seenKeys = new Set<string>();
  const visibleSetups = setupsRaw.filter((s) => {
    const key = `${s.domain}:${s.mailbox_local}`;
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });

  return {
    setups: visibleSetups.map((s) => ({
      id: s.id,
      domain: s.domain,
      mailboxLocal: s.mailbox_local,
      status: s.status,
      errorMsg: friendlyErrorMessage(s.error_msg),
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    })),
    purchases: purchasesRaw.map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      lsOrderId: p.ls_order_id,
      lsOrderIdentifier: p.ls_order_identifier,
      domain:
        p.custom_data && typeof p.custom_data.domain === "string"
          ? (p.custom_data.domain as string)
          : null,
      testMode: p.test_mode,
      createdAt: p.created_at,
      refundedAt: p.refunded_at,
      suspendedAt: p.suspended_at,
      suspensionReason: p.suspension_reason,
    })),
    refunds: refundsRaw.map((r) => ({
      id: r.id,
      purchaseId: r.purchase_id,
      amountCents: r.amount_cents,
      currency: r.currency,
      reason: r.reason,
      triggeredBy: r.triggered_by,
      notes: r.notes,
      createdAt: r.created_at,
    })),
    sendUsage: await fetchSendUsage(supabase, setupsRaw, buckets),
  };
}

async function fetchSendUsage(
  supabase: SsrClient,
  setups: Array<{ domain: string; status: string }>,
  buckets: Record<WindowType, string>,
): Promise<SendUsage[]> {
  const activeDomains = setups
    .filter((s) => s.status === "done")
    .map((s) => s.domain);

  if (activeDomains.length === 0) return [];

  const { data } = await supabase
    .from("send_counters")
    .select("domain, window_type, window_start, count")
    .in("domain", activeDomains)
    .in("window_type", ["day", "hour", "minute"] as WindowType[])
    .in("window_start", Object.values(buckets));

  const rows = (data ?? []) as Array<{
    domain: string;
    window_type: WindowType;
    window_start: string;
    count: number;
  }>;

  return activeDomains.map((domain) => {
    const domainRows = rows.filter((r) => r.domain === domain);
    const get = (w: WindowType) =>
      domainRows.find(
        (r) => r.window_type === w && r.window_start === buckets[w],
      )?.count ?? 0;

    return {
      domain,
      day: { count: get("day"), limit: DEFAULT_SEND_LIMITS.day },
      hour: { count: get("hour"), limit: DEFAULT_SEND_LIMITS.hour },
      minute: { count: get("minute"), limit: DEFAULT_SEND_LIMITS.minute },
    };
  });
}

/**
 * Bucket a setup's status into the 4-state UI vocabulary. The mapping
 * encodes which user-driven steps count as "still going" vs "needs
 * your action" vs "we're done".
 *
 *   - failed       → status === 'failed' (terminal red)
 *   - done         → status === 'done' (terminal green: CF + Postmark +
 *                     Gmail confirmed)
 *   - awaiting_verification → cf_awaiting_destination_verify (the
 *                     user has to click an email in CF) and the
 *                     smtp_dns_written / smtp_verified plateau
 *                     where the user waits on DNS propagation
 *   - in_progress  → everything else (active backend work + the
 *                     guided Gmail wizard steps)
 */
