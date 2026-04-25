import { NextResponse } from "next/server";

import { actOnDeliverability } from "@/lib/abuse-suspend";
import {
  evaluateDeliverability,
  formatRateForStorage,
} from "@/lib/deliverability";
import { createBrevoStatsClient } from "@/lib/integrations/brevo-stats";
import { createServiceClient } from "@/lib/supabase/server";

const RETENTION_DAYS = 90;
const WINDOW_DAYS = 7;

/**
 * Layer 2 cron — pulls a 7-day aggregated report per active domain
 * once an hour (Vercel `vercel.json` schedule), inserts a
 * deliverability_snapshots row, evaluates rates, takes action when
 * a threshold is breached.
 *
 * Auth + isolation match /api/cron/sync-send-counters: per-domain
 * failures don't abort the whole run, snapshots and abuse_events
 * audit rows land via service-role.
 *
 * Retention: post-evaluation, snapshots older than 90 days are deleted
 * in the same tick. The audit row in abuse_events is preserved
 * separately (no auto-purge — those are forensics).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/sync-deliverability] CRON_SECRET not configured");
    return new NextResponse("Cron secret not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[cron/sync-deliverability] BREVO_API_KEY not set");
    return new NextResponse("Brevo key not configured", { status: 500 });
  }

  const admin = createServiceClient();
  const stats = createBrevoStatsClient(apiKey);

  const { data: purchases, error: pErr } = await admin
    .from("purchases")
    .select("id, custom_data")
    .eq("status", "paid")
    .is("suspended_at", null);

  if (pErr) {
    console.error("[cron/sync-deliverability] purchases load failed", pErr);
    return new NextResponse("DB error", { status: 500 });
  }

  const now = new Date();
  const startMs = now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const startDate = new Date(startMs).toISOString().slice(0, 10);
  const endDate = now.toISOString().slice(0, 10);

  type Outcome = {
    domain: string;
    action: string | null;
    requests: number;
    error?: string;
  };
  const summary: {
    checked: number;
    actions: number;
    outcomes: Outcome[];
  } = {
    checked: 0,
    actions: 0,
    outcomes: [],
  };

  for (const p of purchases ?? []) {
    const cd = (p.custom_data ?? {}) as Record<string, unknown>;
    const domain = typeof cd.domain === "string" ? cd.domain : "";
    if (!domain) continue;
    summary.checked += 1;

    try {
      const report = await stats.getAggregatedReport({
        senderDomain: domain,
        startDate,
        endDate,
      });

      const evaluation = evaluateDeliverability(report);

      // Snapshot row first — gives us the FK to attach to the audit
      // row when actOnDeliverability writes one.
      const { data: snapRows, error: snapErr } = await admin
        .from("deliverability_snapshots")
        .insert({
          domain,
          measured_at: now.toISOString(),
          window_days: WINDOW_DAYS,
          requests_count: evaluation.counts.requests,
          bounced_count: evaluation.counts.bounced,
          complained_count: evaluation.counts.complained,
          unsubscribed_count: evaluation.counts.unsubscribed,
          bounce_rate: formatRateForStorage(evaluation.rates.bounce),
          complaint_rate: formatRateForStorage(evaluation.rates.complaint),
          unsubscribe_rate: formatRateForStorage(evaluation.rates.unsubscribe),
          action_taken: evaluation.action,
        })
        .select("id")
        .limit(1);
      if (snapErr) {
        throw new Error(`snapshot insert failed: ${snapErr.message}`);
      }
      const snapshotId = (snapRows ?? [])[0]?.id as string | undefined;

      if (evaluation.action) {
        const result = await actOnDeliverability(admin, {
          domain,
          evaluation,
          snapshotId,
        });
        if (result.acted) summary.actions += 1;
      }

      summary.outcomes.push({
        domain,
        action: evaluation.action,
        requests: evaluation.counts.requests,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[cron/sync-deliverability] failed for ${domain}: ${msg}`);
      summary.outcomes.push({
        domain,
        action: null,
        requests: 0,
        error: msg,
      });
    }
  }

  // Best-effort retention sweep. Errors here don't fail the run since
  // the data we just wrote is more important than the cleanup.
  try {
    const cutoff = new Date(
      now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    await admin
      .from("deliverability_snapshots")
      .delete()
      .lt("measured_at", cutoff);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[cron/sync-deliverability] retention sweep failed: ${msg}`);
  }

  return NextResponse.json(summary, { status: 200 });
}
