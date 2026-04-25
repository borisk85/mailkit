import { NextResponse } from "next/server";

import { suspendForRateLimit } from "@/lib/abuse-suspend";
import { createBrevoStatsClient } from "@/lib/integrations/brevo-stats";
import {
  currentWindowBuckets,
  evaluateSendLimits,
  type SendCounterRow,
} from "@/lib/send-limits";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Layer 1 cron — pulls per-domain send counts from Brevo every
 * 5-10 minutes (Vercel `vercel.json` schedule), upserts the day-window
 * counter row, evaluates limits, suspends domains that crossed.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer <CRON_SECRET>` when
 * the CRON_SECRET env is configured. Anything else → 401 to keep the
 * endpoint from being trivially poked.
 *
 * Why day-only for MVP: Brevo's aggregatedReport API has daily
 * resolution — startDate/endDate are YYYY-MM-DD. Our hour and minute
 * predicates are kept in lib/send-limits.ts because they'll be wired
 * via a secondary signal (e.g. the SMTP-adapter abstraction in #26
 * counts in-process) once available. Day cap (500) catches the bulk
 * of abuse cases by itself; the lower-window thresholds are a
 * defense-in-depth that activates later.
 *
 * Failure posture: per-domain failures don't abort the run. Each
 * domain is wrapped in try/catch so one Brevo timeout doesn't starve
 * other domains. The route returns 200 with a summary; details land
 * in console.error for Vercel runtime logs.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/sync-send-counters] CRON_SECRET not configured");
    return new NextResponse("Cron secret not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("[cron/sync-send-counters] BREVO_API_KEY not set");
    return new NextResponse("Brevo key not configured", { status: 500 });
  }

  const admin = createServiceClient();
  const stats = createBrevoStatsClient(apiKey);

  // Active customers only — paid + not already suspended.
  const { data: purchases, error: pErr } = await admin
    .from("purchases")
    .select("id, custom_data")
    .eq("status", "paid")
    .is("suspended_at", null);

  if (pErr) {
    console.error("[cron/sync-send-counters] purchases load failed", pErr);
    return new NextResponse("DB error", { status: 500 });
  }

  const now = new Date();
  const buckets = currentWindowBuckets(now);
  const dayDate = buckets.day.slice(0, 10); // YYYY-MM-DD
  const todayDate = now.toISOString().slice(0, 10);

  type Outcome = {
    domain: string;
    dayCount: number;
    suspended: boolean;
    error?: string;
  };
  const summary: { checked: number; suspended: number; outcomes: Outcome[] } = {
    checked: 0,
    suspended: 0,
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
        startDate: dayDate,
        endDate: todayDate,
      });
      const dayCount = report.requests;

      // Upsert the day-window counter for the active bucket. Unique
      // (domain, window_type, window_start) constraint makes this an
      // update-on-conflict, so re-running the cron within the same
      // day refreshes the count rather than appending.
      const { error: upsertErr } = await admin.from("send_counters").upsert(
        {
          domain,
          window_type: "day",
          window_start: buckets.day,
          count: dayCount,
          synced_at: now.toISOString(),
        },
        { onConflict: "domain,window_type,window_start" },
      );
      if (upsertErr) {
        throw new Error(`upsert failed: ${upsertErr.message}`);
      }

      // Read all current counters for this domain (we only have the
      // day row in MVP, but evaluateSendLimits is window-agnostic and
      // will pick up hour/minute rows when they exist).
      const { data: counterRows } = await admin
        .from("send_counters")
        .select("domain, window_type, window_start, count")
        .eq("domain", domain);

      const evaluation = evaluateSendLimits({
        domain,
        counters: (counterRows ?? []) as SendCounterRow[],
        now,
      });

      if (evaluation.overLimit) {
        const result = await suspendForRateLimit(admin, {
          domain,
          evaluation,
        });
        if (result.suspended) summary.suspended += 1;
      }

      summary.outcomes.push({
        domain,
        dayCount,
        suspended: evaluation.overLimit,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[cron/sync-send-counters] failed for ${domain}: ${msg}`);
      summary.outcomes.push({
        domain,
        dayCount: 0,
        suspended: false,
        error: msg,
      });
    }
  }

  return NextResponse.json(summary, { status: 200 });
}
