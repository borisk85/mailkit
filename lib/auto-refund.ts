import "server-only";

import { sendAutoRefundEmail } from "@/lib/integrations/postmark-transactional";
import {
  LemonSqueezyError,
  createLemonSqueezyClient,
} from "@/lib/integrations/lemon-squeezy";
import { shouldAutoRefund } from "@/lib/refund-policy";
import type { createServiceClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createServiceClient>;

/**
 * Auto-refund trigger. Called from app/[locale]/app/setup/actions.ts
 * `failRun` immediately after the run is marked failed, so the refund
 * happens on the same request the user sees the error on.
 *
 * Flow:
 *   1. Policy gate — `shouldAutoRefund(step)` per
 *      lib/refund-policy.ts. False → no-op.
 *   2. Look up the run to get user_id + the run's identifying context.
 *   3. Find the user's most recent paid purchase. None / already
 *      refunded → log and skip (support handles via 30-day path).
 *   4. Call LS createRefund (full refund) on that order_id.
 *      - Success → update purchase.status=refunded + refunded_at,
 *        insert refunds audit row (reason=automation_failure,
 *        triggered_by=system, run_id filled).
 *      - Failure → insert refunds row with notes recording the LS
 *        error; leave purchase.status=paid so support can retry or
 *        resolve manually.
 *
 * This function must not throw — failRun's caller path already
 * returned an error to the user, and an auto-refund hiccup should
 * not cascade into an unhandled exception on top. All errors are
 * swallowed and logged; support gets evidence via refunds.notes.
 */
export async function triggerAutoRefund(
  admin: AdminClient,
  runId: string,
  step: string,
): Promise<void> {
  try {
    if (!shouldAutoRefund(step)) return;

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (!apiKey) {
      console.error(
        "[auto-refund] LEMONSQUEEZY_API_KEY not set; cannot auto-refund",
      );
      return;
    }

    // Run context — we only need user_id here. run_id itself is
    // passed to the refunds audit row verbatim.
    const { data: run } = await admin
      .from("setup_runs")
      .select("id, user_id")
      .eq("id", runId)
      .maybeSingle();

    if (!run?.user_id) {
      console.warn(
        `[auto-refund] run ${runId} missing user_id; cannot locate purchase`,
      );
      return;
    }

    // Find the most recent paid purchase for this user. If there are
    // multiple (future bundle SKUs), refund the most recent — the
    // user was mid-setup on it. One purchase per user is the MVP
    // expectation.
    const { data: purchases } = await admin
      .from("purchases")
      .select("id, ls_order_id, amount_cents, currency, status, user_email")
      .eq("user_id", run.user_id)
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(1);

    const purchase = purchases?.[0];
    if (!purchase) {
      console.warn(
        `[auto-refund] no paid purchase found for user ${run.user_id}; run ${runId} failed at step ${step}`,
      );
      return;
    }

    const client = createLemonSqueezyClient(apiKey);

    try {
      const refunded = await client.createRefund(purchase.ls_order_id);

      // LS says refund happened — reconcile our tables. The webhook
      // handler will also receive `order_refunded` from LS; its
      // idempotency check (purchase.status === "refunded") short-
      // circuits to avoid a duplicate audit row.
      await admin
        .from("purchases")
        .update({
          status: "refunded",
          refunded_at: refunded.refundedAt ?? new Date().toISOString(),
        })
        .eq("id", purchase.id);

      await admin.from("refunds").insert({
        purchase_id: purchase.id,
        run_id: runId,
        amount_cents: refunded.refundedAmountCents || purchase.amount_cents,
        currency: purchase.currency,
        reason: "automation_failure",
        triggered_by: "system",
        notes: `Auto-refund triggered by failed_step=${step}. LS order ${purchase.ls_order_id}.`,
      });

      console.info(
        `[auto-refund] refunded purchase ${purchase.id} (LS order ${purchase.ls_order_id}) for run ${runId}, step ${step}`,
      );

      // Notify the buyer. Email failure must not cascade: the refund
      // has already landed on LS + in our DB; a missed email is a
      // support issue, not a refund-pipeline failure. Swallow + log
      // so `triggerAutoRefund` stays side-effect-safe.
      if (purchase.user_email) {
        try {
          await sendAutoRefundEmail({
            toEmail: purchase.user_email,
            failedStep: step,
          });
        } catch (emailErr) {
          const emsg =
            emailErr instanceof Error ? emailErr.message : String(emailErr);
          console.error(
            `[auto-refund] refund email failed for purchase ${purchase.id} run ${runId}: ${emsg}`,
          );
        }
      } else {
        console.warn(
          `[auto-refund] purchase ${purchase.id} has no user_email; skipping notification`,
        );
      }
    } catch (lsErr) {
      const lsMessage =
        lsErr instanceof LemonSqueezyError
          ? `${lsErr.code} (${lsErr.httpStatus}): ${lsErr.message}`
          : lsErr instanceof Error
            ? lsErr.message
            : String(lsErr);

      console.error(
        `[auto-refund] LS createRefund failed for purchase ${purchase.id} run ${runId} step ${step}: ${lsMessage}`,
      );

      // Leave purchase.status=paid (support can retry) and log the
      // attempted refund so support has the evidence trail. Note
      // convention: "LS_CALL_FAILED: <details>" so the support
      // template can grep for these.
      await admin.from("refunds").insert({
        purchase_id: purchase.id,
        run_id: runId,
        amount_cents: 0,
        currency: purchase.currency,
        reason: "automation_failure",
        triggered_by: "system",
        notes: `LS_CALL_FAILED at auto-refund: ${lsMessage}. failed_step=${step}. LS order ${purchase.ls_order_id}. Manual retry required.`,
      });
    }
  } catch (outer) {
    // Last-ditch: never let auto-refund bubble up.
    const msg = outer instanceof Error ? outer.message : String(outer);
    console.error(`[auto-refund] unexpected error for run ${runId}: ${msg}`);
  }
}
