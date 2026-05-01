import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { friendlyErrorMessage } from "@/lib/error-messages";
import {
  currentWindowBuckets,
  DEFAULT_SEND_LIMITS,
  type WindowType,
} from "@/lib/send-limits";

type SsrClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Read-side data shapes + derivations for the /app dashboard (#37 + #51).
 *
 * RLS-aware: queries run on the user-session client (auth.uid() in the
 * row policies), not service-role. The client can only see their own
 * setup_runs / purchases / refunds — no cross-tenant leakage even if
 * a future bug hands a wrong user_id to a helper.
 *
 * Purpose split:
 *   - `getDashboardData` runs the three table reads in parallel.
 *   - The pure functions below (`setupOverallState`, etc.) are tested
 *     in isolation; they encode the policy decisions that the UI
 *     should not duplicate (e.g. "what counts as a failed setup").
 */

export type SetupStatus =
  | "started"
  | "cf_routing_enabled"
  | "cf_dns_written"
  | "cf_awaiting_destination_verify"
  | "cf_rule_created"
  | "cf_done"
  | "brevo_sender_created"
  | "brevo_dns_written"
  | "brevo_verified"
  | "brevo_done"
  | "gmail_instructions_shown"
  | "gmail_smtp_ready"
  | "gmail_send_as_verified"
  | "done"
  | "failed";

export type PurchaseStatus =
  | "paid"
  | "refunded"
  | "partially_refunded"
  | "fraudulent";

export type DashboardSetup = {
  id: string;
  domain: string;
  mailboxLocal: string;
  status: SetupStatus;
  errorMsg: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardPurchase = {
  id: string;
  amountCents: number;
  currency: string;
  status: PurchaseStatus;
  lsOrderId: string;
  lsOrderIdentifier: string | null;
  domain: string | null;
  testMode: boolean;
  createdAt: string;
  refundedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
};

export type DashboardRefund = {
  id: string;
  purchaseId: string;
  amountCents: number;
  currency: string;
  reason: string;
  triggeredBy: string;
  notes: string | null;
  createdAt: string;
};

export type SendUsage = {
  domain: string;
  day: { count: number; limit: number };
  hour: { count: number; limit: number };
  minute: { count: number; limit: number };
};

export type DashboardData = {
  setups: DashboardSetup[];
  purchases: DashboardPurchase[];
  refunds: DashboardRefund[];
  sendUsage: SendUsage[];
};

/** UI-facing setup state — collapses the 14-status enum into 4 buckets
 * the dashboard renders as Badges. */
export type SetupOverallState =
  | "in_progress"
  | "awaiting_verification"
  | "done"
  | "failed";

/**
 * Run the three reads in parallel via Promise.all. Each is RLS-bounded
 * to the calling user, so an empty array is the natural "no data yet"
 * answer — no errors thrown for first-time users.
 *
 * The `purchases` row carries `custom_data jsonb`; we extract `domain`
 * inline so consumers don't have to dig through the JSON shape.
 */
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

  return {
    setups: setupsRaw.map((s) => ({
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
 *   - done         → status === 'done' (terminal green: CF + Brevo +
 *                     Gmail confirmed)
 *   - awaiting_verification → cf_awaiting_destination_verify (the
 *                     user has to click an email in CF) and the
 *                     brevo_dns_written / brevo_verified plateau
 *                     where the user waits on DNS propagation
 *   - in_progress  → everything else (active backend work + the
 *                     guided Gmail wizard steps)
 */
export function setupOverallState(setup: {
  status: SetupStatus;
}): SetupOverallState {
  switch (setup.status) {
    case "failed":
      return "failed";
    case "done":
      return "done";
    case "cf_awaiting_destination_verify":
    case "brevo_dns_written":
    case "brevo_verified":
    case "gmail_instructions_shown":
    case "gmail_smtp_ready":
    case "gmail_send_as_verified":
      return "awaiting_verification";
    default:
      return "in_progress";
  }
}

/**
 * True when this setup is eligible for the "Re-setup this domain"
 * button — failed runs only, per architect spec.
 */
export function isSetupReSetupEligible(setup: {
  status: SetupStatus;
}): boolean {
  return setup.status === "failed";
}

/**
 * #DASH-2 — granular one-line status description shown beneath the
 * badge in setup cards. Returns null for terminal states (done/failed)
 * where the badge + errorMsg carry enough context.
 */
export function setupDetailLabel(status: SetupStatus): string | null {
  switch (status) {
    case "started":
      return "Starting setup…";
    case "cf_routing_enabled":
      return "Cloudflare Email Routing enabled";
    case "cf_dns_written":
      return "DNS records written (MX, SPF, DMARC)";
    case "cf_awaiting_destination_verify":
      return "Check your Gmail for a Cloudflare verification email";
    case "cf_rule_created":
      return "Cloudflare routing rule created";
    case "cf_done":
      return "Cloudflare phase complete";
    case "brevo_sender_created":
      return "SMTP sender registered";
    case "brevo_dns_written":
      return "Authentication records added — waiting for DNS propagation";
    case "brevo_verified":
      return "DNS records verified";
    case "brevo_done":
      return "SMTP phase complete";
    case "gmail_instructions_shown":
      return "Open setup to complete the Gmail Send-As step";
    case "gmail_smtp_ready":
      return "Paste the four lines into Gmail to finish";
    case "gmail_send_as_verified":
      return "Gmail Send-As confirmed";
    case "done":
    case "failed":
      return null;
  }
}

/**
 * Format an amount_cents + currency as a UI string. Both EN and RU
 * dashboards display the same numeric format ("$5.00"), only the
 * surrounding labels are translated. Currency is uppercased to
 * normalize the LS payload which sometimes returns "usd".
 */
export function formatMoney(amountCents: number, currency: string): string {
  const normalized = (currency || "USD").toUpperCase();
  const value = (amountCents / 100).toFixed(2);
  return normalized === "USD" ? `$${value}` : `${value} ${normalized}`;
}

/**
 * Effective purchase status from the purchase row + the refund history
 * for it. Mostly mirrors `purchase.status`, but if the column says
 * "paid" while a refund row exists for the same purchase, surfaces
 * "refunded" — guards against a state where the LS webhook hadn't
 * landed yet but our auto-refund flow already wrote the refunds row.
 */
export function purchaseEffectiveStatus(
  purchase: { status: PurchaseStatus; id: string },
  refunds: Array<{ purchaseId: string; amountCents: number }>,
): PurchaseStatus {
  if (purchase.status !== "paid") return purchase.status;
  const matched = refunds.filter(
    (r) => r.purchaseId === purchase.id && r.amountCents > 0,
  );
  if (matched.length > 0) return "refunded";
  return "paid";
}
