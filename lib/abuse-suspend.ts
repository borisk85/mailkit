import "server-only";

import {
  sendDeliverabilitySuspendEmail,
  sendDeliverabilityWarnEmail,
  sendSendLimitBlockEmail,
} from "@/lib/integrations/postmark-transactional";
import {
  createPostmarkAccountClient,
  type PostmarkAccountClient,
} from "@/lib/integrations/postmark";
import { notifyOwnerViaTelegram } from "@/lib/notifications/telegram";
import {
  type DeliverabilityEvaluation,
  formatRateForStorage,
} from "@/lib/deliverability";
import {
  periodLabel,
  type SendLimitEvaluation,
  type WindowType,
} from "@/lib/send-limits";
import type { createServiceClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createServiceClient>;

/**
 * Anti-abuse action helpers — DB writes + audit row + customer email
 * for a domain that crossed a Layer 1 (rate-limit) or Layer 2
 * (deliverability) threshold.
 *
 * What this file does NOT do:
 *
 *   1. Hard-suspend the domain at the SMTP provider level. Postmark
 *      supports SmtpApiActivated=false per server (see postmark.ts
 *      suspendServer). For MVP the DB flag (purchases.suspended_at)
 *      is the source of truth. If a suspended customer keeps sending,
 *      Postmark's own complaint-rate threshold takes over before we'd
 *      reach a true incident.
 *
 *   2. Throw on email failure. The pause / audit row must land even
 *      if transactional delivery is down, so a customer can't use a
 *      transient mail outage to skip the suspension trail.
 *
 * Both helpers are idempotent on `purchases.suspended_at IS NULL` —
 * a domain already suspended is left alone, but the abuse_events
 * audit row is still appended (so repeat-offender tracking works).
 */

type PurchaseLite = {
  id: string;
  user_email: string;
  custom_data: Record<string, unknown>;
};

async function findActivePurchaseForDomain(
  admin: AdminClient,
  domain: string,
): Promise<PurchaseLite | null> {
  // custom_data.domain is the source of truth for which purchase
  // covers which sender domain (set when the LS checkout custom
  // params or the post-payment linking writes it). We fall back to
  // the most-recent paid purchase if that's empty so old rows that
  // predated the custom_data convention still resolve.
  const { data } = await admin
    .from("purchases")
    .select("id, user_email, custom_data, created_at, status, suspended_at")
    .contains("custom_data", { domain })
    .order("created_at", { ascending: false })
    .limit(1);

  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    id: row.id,
    user_email: row.user_email ?? "",
    custom_data: (row.custom_data ?? {}) as Record<string, unknown>,
  };
}

async function findPostmarkServerIdForDomain(
  admin: AdminClient,
  domain: string,
): Promise<number | null> {
  const { data } = await admin
    .from("setup_runs")
    .select("postmark_server_id")
    .eq("domain", domain)
    .eq("status", "done")
    .not("postmark_server_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  const row = (data ?? [])[0];
  if (!row?.postmark_server_id) return null;
  return row.postmark_server_id as number;
}

async function suspendTenantInPostmark(
  admin: AdminClient,
  pm: PostmarkAccountClient,
  domain: string,
): Promise<"ok" | "skipped" | `failed=${string}`> {
  let serverId: number | null;
  try {
    serverId = await findPostmarkServerIdForDomain(admin, domain);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `failed=lookup:${msg.slice(0, 80)}`;
  }

  if (serverId === null) return "skipped";

  try {
    await pm.suspendServer(serverId);
    return "ok";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Already-suspended servers return a 4xx — treat as ok, not an error.
    if (msg.toLowerCase().includes("already") || msg.includes("409")) {
      return "ok";
    }
    return `failed=${msg.slice(0, 80)}`;
  }
}

async function flagSuspended(
  admin: AdminClient,
  purchaseId: string,
  reason: string,
): Promise<void> {
  // Idempotent: only set if not already suspended. We don't overwrite
  // the original suspension reason on a second trip — the first
  // signal wins, audit row records the second one separately.
  await admin
    .from("purchases")
    .update({
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
    })
    .eq("id", purchaseId)
    .is("suspended_at", null);
}

async function insertAbuseEvent(
  admin: AdminClient,
  args: {
    domain: string;
    eventType: string;
    actionTaken: string;
    thresholdValue?: number;
    observedValue?: number;
    purchaseId?: string;
    snapshotId?: string;
    notes?: string;
  },
): Promise<void> {
  await admin.from("abuse_events").insert({
    domain: args.domain,
    event_type: args.eventType,
    action_taken: args.actionTaken,
    threshold_value: args.thresholdValue ?? null,
    observed_value: args.observedValue ?? null,
    purchase_id: args.purchaseId ?? null,
    snapshot_id: args.snapshotId ?? null,
    notes: args.notes ?? null,
  });

  notifyOwnerViaTelegram(
    `domain=${args.domain} action=${args.actionTaken}${args.notes ? ` ${args.notes}` : ""}`,
    args.eventType,
  ).catch((e) => console.error("[telegram-alert] abuse notify failed:", e));
}

function nextResumeHint(window: WindowType): string {
  if (window === "minute") return "in the next minute";
  if (window === "hour") return "in the next hour";
  return "when the day counter resets at 00:00 UTC";
}

function makePostmarkClientOrNull(): PostmarkAccountClient | null {
  const token = process.env.POSTMARK_ACCOUNT_TOKEN;
  if (!token) return null;
  try {
    return createPostmarkAccountClient(token);
  } catch {
    return null;
  }
}

/**
 * Layer 1 action — domain hit the per-domain rate limit. Sends are
 * paused, customer is emailed, audit row written, Postmark server disabled.
 */
export async function suspendForRateLimit(
  admin: AdminClient,
  args: {
    domain: string;
    evaluation: SendLimitEvaluation;
  },
): Promise<{ suspended: boolean; emailed: boolean }> {
  const { domain, evaluation } = args;
  if (!evaluation.overLimit) return { suspended: false, emailed: false };

  // Pick the most-restrictive window that tripped (minute > hour > day)
  // — that's the one with the shortest resume time, which is what the
  // customer most needs to hear about.
  const order: WindowType[] = ["minute", "hour", "day"];
  const tripped = order.find((w) => evaluation.exceeded.includes(w));
  if (!tripped) return { suspended: false, emailed: false };
  const window = evaluation.windows[tripped];

  const purchase = await findActivePurchaseForDomain(admin, domain);

  let pmSuspendNote = "auto_suspend_postmark_server:skipped";
  if (purchase) {
    await flagSuspended(admin, purchase.id, "rate_limit");
    const pm = makePostmarkClientOrNull();
    if (pm) {
      const result = await suspendTenantInPostmark(admin, pm, domain);
      pmSuspendNote = `auto_suspend_postmark_server:${result}`;
    }
  }

  await insertAbuseEvent(admin, {
    domain,
    eventType: "rate_limit_block",
    actionTaken: "suspended",
    thresholdValue: window.limit,
    observedValue: window.count,
    purchaseId: purchase?.id,
    notes: `window=${tripped}, count=${window.count}, limit=${window.limit}; ${pmSuspendNote}`,
  });

  let emailed = false;
  if (purchase?.user_email) {
    try {
      await sendSendLimitBlockEmail({
        toEmail: purchase.user_email,
        domain,
        period: periodLabel(tripped),
        observed: window.count,
        limit: window.limit,
        resumeHint: nextResumeHint(tripped),
      });
      emailed = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[abuse] rate-limit email failed for ${domain} (${purchase.id}): ${msg}`,
      );
    }
  }

  return { suspended: !!purchase, emailed };
}

/**
 * Layer 2 action — domain crossed the deliverability threshold.
 * `action='suspended'` flips the DB flag; `action='warned'` only
 * records the audit + warning email (no DB flag flip — customer keeps
 * sending). `evaluation.action===null` is a no-op.
 */
export async function actOnDeliverability(
  admin: AdminClient,
  args: {
    domain: string;
    evaluation: DeliverabilityEvaluation;
    snapshotId?: string;
  },
): Promise<{ acted: boolean; emailed: boolean }> {
  const { domain, evaluation, snapshotId } = args;
  if (!evaluation.action || !evaluation.reason) {
    return { acted: false, emailed: false };
  }

  const purchase = await findActivePurchaseForDomain(admin, domain);

  let pmSuspendNote = "";
  if (evaluation.action === "suspended" && purchase) {
    await flagSuspended(admin, purchase.id, evaluation.reason);
    const pm = makePostmarkClientOrNull();
    if (pm) {
      const result = await suspendTenantInPostmark(admin, pm, domain);
      pmSuspendNote = `; auto_suspend_postmark_server:${result}`;
    }
  }

  // Pick the rate that drove the decision so the audit row + email
  // reflect the true trigger, not whichever was most extreme.
  const drivingRate =
    evaluation.reason === "complaint_threshold"
      ? evaluation.rates.complaint
      : evaluation.reason === "bounce_threshold"
        ? evaluation.rates.bounce
        : evaluation.rates.unsubscribe;
  const drivingThreshold =
    evaluation.reason === "complaint_threshold"
      ? evaluation.thresholds.complaint
      : evaluation.reason === "bounce_threshold"
        ? evaluation.thresholds.bounce
        : evaluation.thresholds.unsubscribe;

  await insertAbuseEvent(admin, {
    domain,
    eventType: evaluation.reason,
    actionTaken: evaluation.action,
    thresholdValue: formatRateForStorage(drivingThreshold),
    observedValue: formatRateForStorage(drivingRate),
    purchaseId: purchase?.id,
    snapshotId,
    notes: `requests=${evaluation.counts.requests}, bounced=${evaluation.counts.bounced}, complained=${evaluation.counts.complained}, unsubscribed=${evaluation.counts.unsubscribed}${pmSuspendNote}`,
  });

  let emailed = false;
  if (purchase?.user_email) {
    try {
      if (evaluation.action === "suspended") {
        await sendDeliverabilitySuspendEmail({
          toEmail: purchase.user_email,
          domain,
          kind:
            evaluation.reason === "complaint_threshold"
              ? "complaint"
              : "bounce",
          observedRate: drivingRate,
          thresholdRate: drivingThreshold,
        });
      } else {
        await sendDeliverabilityWarnEmail({
          toEmail: purchase.user_email,
          domain,
          observedRate: drivingRate,
          thresholdRate: drivingThreshold,
        });
      }
      emailed = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(
        `[abuse] deliverability ${evaluation.action} email failed for ${domain}: ${msg}`,
      );
    }
  }

  return { acted: true, emailed };
}
