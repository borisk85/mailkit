/**
 * Shared types and pure utility functions for the /app dashboard.
 * Intentionally free of "server-only" so client components can import.
 * The data-fetching layer (getDashboardData) lives in dashboard-data.ts.
 */

export type SetupStatus =
  | "started"
  | "cf_routing_enabled"
  | "cf_dns_written"
  | "cf_awaiting_destination_verify"
  | "cf_rule_created"
  | "cf_done"
  | "smtp_sender_created"
  | "smtp_dns_written"
  | "smtp_verified"
  | "smtp_done"
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

/** UI-facing setup state — collapses the 14-status enum into 4 buckets. */
export type SetupOverallState =
  | "in_progress"
  | "awaiting_verification"
  | "done"
  | "failed";

export function setupOverallState(setup: {
  status: SetupStatus;
}): SetupOverallState {
  switch (setup.status) {
    case "failed":
      return "failed";
    case "done":
      return "done";
    case "cf_awaiting_destination_verify":
    case "smtp_dns_written":
    case "smtp_verified":
    case "gmail_instructions_shown":
    case "gmail_smtp_ready":
    case "gmail_send_as_verified":
      return "awaiting_verification";
    default:
      return "in_progress";
  }
}

export function isSetupReSetupEligible(setup: {
  status: SetupStatus;
}): boolean {
  return setup.status === "failed";
}

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
    case "smtp_sender_created":
      return "SMTP sender registered";
    case "smtp_dns_written":
      return "Authentication records added. Waiting for DNS propagation";
    case "smtp_verified":
      return "DNS records verified";
    case "smtp_done":
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

export function formatMoney(amountCents: number, currency: string): string {
  const normalized = (currency || "USD").toUpperCase();
  const value = (amountCents / 100).toFixed(2);
  return normalized === "USD" ? `$${value}` : `${value} ${normalized}`;
}

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
