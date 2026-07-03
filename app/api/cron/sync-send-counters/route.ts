import { NextResponse } from "next/server";

import { suspendForRateLimit } from "@/lib/abuse-suspend";
import { runCron } from "@/lib/cron-alert";
import { createPostmarkStatsClient } from "@/lib/integrations/postmark-stats";
import { sendTelegramAlert } from "@/lib/telegram-alert";
import {
  currentWindowBuckets,
  evaluateSendLimits,
  type SendCounterRow,
} from "@/lib/send-limits";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Layer 1 cron — pulls per-domain send counts from Postmark every
 * 5-10 minutes (Vercel `vercel.json` schedule), upserts the day-window
 * counter row, evaluates limits, suspends domains that crossed.
 *
 * Auth: Vercel Cron sets `Authorization: Bearer <CRON_SECRET>` when
 * the CRON_SECRET env is configured. Anything else → 401 to keep the
 * endpoint from being trivially poked.
 *
 * Why day-only for MVP: Postmark's outbound stats API has daily
 * resolution — startDate/endDate are YYYY-MM-DD. Our hour and minute
 * predicates are kept in lib/send-limits.ts because they'll be wired
 * via a secondary signal (e.g. the SMTP-adapter abstraction in #26
 * counts in-process) once available. Day cap (500) catches the bulk
 * of abuse cases by itself; the lower-window thresholds are a
 * defense-in-depth that activates later.
 *
 * Failure posture: per-domain failures don't abort the run. Each
 * domain is wrapped in try/catch so one Postmark timeout doesn't starve
 * other domains. The route returns 200 with a summary; details land
 * in console.error for Vercel runtime logs.
 */
export async function GET(request: Request) {
  return runCron("sync-send-counters", () => handler(request));
}

async function handler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/sync-send-counters] CRON_SECRET not configured");
    return new NextResponse("Cron secret not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createServiceClient();

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
      // Look up Postmark server token for this domain.
      const { data: run } = await admin
        .from("setup_runs")
        .select("cf_state")
        .eq("domain", domain)
        .eq("status", "done")
        .not("postmark_server_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const serverToken = (
        (run?.cf_state as Record<string, unknown> | null)?.postmark as
          | Record<string, unknown>
          | undefined
      )?.server_token as string | undefined;

      if (!serverToken) {
        summary.outcomes.push({
          domain,
          dayCount: 0,
          suspended: false,
          error: "no_postmark_server_token",
        });
        continue;
      }

      const stats = createPostmarkStatsClient(serverToken);
      const report = await stats.getAggregatedReport({
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

  // Refund-abuse detector: a refunded purchase whose domain still
  // sends through our relay. Sends counted from refunded_at onward.
  // Fires on every run until the owner suspends the server — that
  // repetition is intentional (the alert is the to-do list).
  try {
    const { data: refunded } = await admin
      .from("purchases")
      .select("user_email, refunded_at, custom_data")
      .eq("status", "refunded")
      .gte(
        "refunded_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      );

    for (const p of refunded ?? []) {
      const cd = (p.custom_data ?? {}) as Record<string, unknown>;
      const domain = typeof cd.domain === "string" ? cd.domain : "";
      if (!domain || !p.refunded_at) continue;

      const { data: run } = await admin
        .from("setup_runs")
        .select("cf_state")
        .eq("domain", domain)
        .not("postmark_server_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const serverToken = (
        (run?.cf_state as Record<string, unknown> | null)?.postmark as
          | Record<string, unknown>
          | undefined
      )?.server_token as string | undefined;
      if (!serverToken) continue;

      const stats = createPostmarkStatsClient(serverToken);
      const report = await stats.getAggregatedReport({
        startDate: p.refunded_at.slice(0, 10),
        endDate: todayDate,
      });

      if (report.requests > 0) {
        await sendTelegramAlert([
          "🟠 MailKit — refunded but still sending",
          `Domain ${domain} got a refund on ${p.refunded_at.slice(0, 10)} and has sent ${report.requests} emails since.`,
          `User: ${p.user_email || "unknown"}`,
          "Suspend the Postmark server to cut them off.",
        ]);
      }
    }
  } catch (e) {
    console.error("[cron/sync-send-counters] refund-abuse detector failed", e);
  }

  return NextResponse.json(summary, { status: 200 });
}
