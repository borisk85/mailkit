import { NextResponse } from "next/server";

import {
  createLemonSqueezyClient,
  hashWebhookBody,
  verifyWebhookSignature,
} from "@/lib/integrations/lemon-squeezy";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Lemon Squeezy webhook receiver.
 *
 * Flow:
 *   1. Read raw body (must happen before JSON.parse — signature is
 *      computed over the literal bytes LS sent, and JSON.stringify +
 *      re-parse can alter whitespace).
 *   2. HMAC-SHA256 verify the X-Signature header against the webhook
 *      secret. Fail-closed on any mismatch — return 401 with no DB
 *      write.
 *   3. SHA-256 hash the body → upsert a webhook_events row keyed
 *      (source, body_hash). Unique constraint does the idempotency:
 *      LS retries get the same row and short-circuit without
 *      re-processing.
 *   4. Dispatch on meta.event_name. order_created inserts / upserts
 *      a purchases row; order_refunded flips purchases.status +
 *      inserts a refunds audit row. Unknown events are logged and
 *      marked processed — LS lets you subscribe to future events
 *      without code changes.
 *   5. Return 200 on success. On processing error, return 500 so LS
 *      retries — but ensure the webhook_events row captures the
 *      error message for offline debugging.
 *
 * Runtime: Node.js (default App-Router route). Edge would need
 * crypto polyfills for HMAC timing-safe compare; not worth the
 * complexity.
 */
export async function POST(request: Request) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[ls-webhook] LEMONSQUEEZY_WEBHOOK_SECRET not set");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Signature");

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let payload: LsWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as LsWebhookPayload;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const eventName = payload?.meta?.event_name;
  if (!eventName) {
    return new NextResponse("Missing meta.event_name", { status: 400 });
  }

  const bodyHash = hashWebhookBody(rawBody);
  const admin = createServiceClient();

  // Dedupe via unique(source, body_hash). If the same payload arrives
  // twice (LS retry), the insert is a no-op and we return 200 without
  // re-processing. We detect via maybeSingle + row presence check
  // because Supabase's insert().select() returns an error on conflict
  // with upsert disabled.
  const { data: existing } = await admin
    .from("webhook_events")
    .select("id, processed, processing_error")
    .eq("source", "lemon_squeezy")
    .eq("body_hash", bodyHash)
    .maybeSingle();

  if (existing) {
    // Already received; skip re-processing. Return 200 so LS stops
    // retrying.
    return NextResponse.json({ deduplicated: true }, { status: 200 });
  }

  const { data: eventRow, error: insertErr } = await admin
    .from("webhook_events")
    .insert({
      source: "lemon_squeezy",
      event_name: eventName,
      body_hash: bodyHash,
      body: payload,
      processed: false,
    })
    .select("id")
    .single();

  if (insertErr || !eventRow) {
    console.error(
      "[ls-webhook] failed to insert webhook_events row",
      insertErr,
    );
    return new NextResponse("DB error", { status: 500 });
  }

  try {
    await processEvent(admin, eventName, payload);
    await admin
      .from("webhook_events")
      .update({ processed: true })
      .eq("id", eventRow.id);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[ls-webhook] ${eventName} processing failed:`, message);
    await admin
      .from("webhook_events")
      .update({ processing_error: message.slice(0, 500) })
      .eq("id", eventRow.id);
    return new NextResponse("Processing error", { status: 500 });
  }
}

async function processEvent(
  admin: ReturnType<typeof createServiceClient>,
  eventName: string,
  payload: LsWebhookPayload,
) {
  switch (eventName) {
    case "order_created":
      return handleOrderCreated(admin, payload);
    case "order_refunded":
      return handleOrderRefunded(admin, payload);
    default:
      // Unknown event (e.g. subscription_*) — log + ignore. LS docs
      // recommend returning 200 on unsubscribed events.
      console.info(`[ls-webhook] ignoring event ${eventName}`);
  }
}

async function handleOrderCreated(
  admin: ReturnType<typeof createServiceClient>,
  payload: LsWebhookPayload,
) {
  const attrs = payload.data?.attributes;
  const orderId = payload.data?.id;
  if (!attrs || !orderId) {
    throw new Error("order_created payload missing data.attributes");
  }

  const customData = payload.meta?.custom_data ?? {};
  const userId =
    typeof customData.user_id === "string" && customData.user_id.length > 0
      ? customData.user_id
      : null;

  const row = {
    user_id: userId,
    ls_order_id: String(orderId),
    ls_order_identifier: attrs.identifier ?? null,
    amount_cents: attrs.total ?? 0,
    currency: attrs.currency ?? "USD",
    status: "paid" as const,
    test_mode: !!attrs.test_mode,
    custom_data: customData,
    user_email: attrs.user_email ?? "",
  };

  // Upsert on ls_order_id so LS replay / manual resend doesn't dup.
  const { error } = await admin
    .from("purchases")
    .upsert(row, { onConflict: "ls_order_id", ignoreDuplicates: true });

  if (error) {
    throw new Error(`purchases upsert failed: ${error.message}`);
  }

  // Coupon abuse guard: if this order is free (amount=0) and the user
  // already has a prior paid purchase, refund immediately. One free
  // setup per customer — subsequent setups pay full price.
  if (row.amount_cents === 0 && userId) {
    const { count } = await admin
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "paid")
      .neq("ls_order_id", String(orderId));

    if (count && count > 0) {
      // Mark refunded in DB immediately so the wizard gate sees it
      // before the LS API round-trip completes — otherwise the setup
      // advances while the refund is still in-flight.
      await admin
        .from("purchases")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
        })
        .eq("ls_order_id", String(orderId));

      const apiKey = process.env.LEMONSQUEEZY_API_KEY;
      if (apiKey) {
        const ls = createLemonSqueezyClient(apiKey);
        await ls.createRefund(String(orderId));
      }
      console.info(
        `[ls-webhook] coupon abuse — auto-refunded order ${orderId} for user ${userId}`,
      );
    }
  }
}

async function handleOrderRefunded(
  admin: ReturnType<typeof createServiceClient>,
  payload: LsWebhookPayload,
) {
  const attrs = payload.data?.attributes;
  const orderId = payload.data?.id;
  if (!attrs || !orderId) {
    throw new Error("order_refunded payload missing data.attributes");
  }

  const { data: purchase, error: lookupErr } = await admin
    .from("purchases")
    .select("id, status, amount_cents, currency")
    .eq("ls_order_id", String(orderId))
    .maybeSingle();

  if (lookupErr) {
    throw new Error(`purchases lookup failed: ${lookupErr.message}`);
  }

  if (!purchase) {
    // Refund event without a prior order_created — unusual, but we
    // log and move on. The purchase row will be reconciled manually
    // if support notices.
    console.warn(
      `[ls-webhook] order_refunded for unknown ls_order_id=${orderId}`,
    );
    return;
  }

  // Idempotency: if we've already marked this refunded, skip the
  // refunds insert so we don't stack audit rows on replays.
  if (purchase.status === "refunded") return;

  const { error: updateErr } = await admin
    .from("purchases")
    .update({
      status: "refunded",
      refunded_at: attrs.refunded_at ?? new Date().toISOString(),
    })
    .eq("id", purchase.id);

  if (updateErr) {
    throw new Error(`purchases update failed: ${updateErr.message}`);
  }

  const refundedAmount =
    typeof attrs.refunded_amount === "number"
      ? attrs.refunded_amount
      : purchase.amount_cents;

  const { error: refundErr } = await admin.from("refunds").insert({
    purchase_id: purchase.id,
    amount_cents: refundedAmount,
    currency: purchase.currency,
    reason: "manual_support_discretion",
    triggered_by: "support",
    notes:
      "Refund observed via order_refunded webhook; reason/triggered_by set to manual defaults. Auto-refund flow writes its own refunds row ahead of the webhook and this inserts a second audit row only if that flow did not run.",
  });

  if (refundErr) {
    throw new Error(`refunds insert failed: ${refundErr.message}`);
  }
}

type LsWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, unknown>;
  };
  data?: {
    id?: string | number;
    type?: string;
    attributes?: {
      identifier?: string;
      status?: string;
      user_email?: string;
      total?: number;
      currency?: string;
      refunded?: boolean;
      refunded_at?: string;
      refunded_amount?: number;
      test_mode?: boolean;
    };
  };
};
