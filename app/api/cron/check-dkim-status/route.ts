import { NextResponse } from "next/server";

import {
  sendDkimDelayedEmail,
  sendDkimReadyEmail,
} from "@/lib/notifications/email";
import { createPostmarkAccountClient } from "@/lib/integrations/postmark";
import { createServiceClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://getmailkit.com";

/**
 * Cron — runs every minute. Checks pending DKIM verifications:
 *
 *   verified + user inactive >5min (or email explicitly requested):
 *     → advance status to brevo_done, send "domain ready" email
 *
 *   not verified + dns_written >15min + 15m email not sent:
 *     → send "still verifying" email once
 *
 *   not verified + dns_written >30min + 30m email not sent:
 *     → send "taking longer than usual" email once
 *
 * Uses updated_at as a proxy for when brevo_dns_written was set; accurate
 * enough for the 15/30-min thresholds at MVP scale.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/check-dkim-status] CRON_SECRET not configured");
    return new NextResponse("Cron secret not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const postmarkToken = process.env.POSTMARK_ACCOUNT_TOKEN;
  if (!postmarkToken) {
    return new NextResponse("POSTMARK_ACCOUNT_TOKEN not set", { status: 500 });
  }

  const admin = createServiceClient();
  const pm = createPostmarkAccountClient(postmarkToken);
  const now = Date.now();

  const { data: rows, error } = await admin
    .from("setup_runs")
    .select(
      "id, domain, status, cf_state, updated_at, last_active_at, dkim_notify_15m_sent_at, dkim_notify_30m_sent_at",
    )
    .eq("status", "brevo_dns_written");

  if (error) {
    console.error("[cron/check-dkim-status] DB error:", error.message);
    return new NextResponse("DB error", { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ checked: 0 });
  }

  const outcomes = await Promise.allSettled(
    rows.map(async (row) => {
      const pmState = ((row.cf_state as Record<string, unknown> | null)
        ?.postmark ?? {}) as Record<string, unknown>;
      const domainId = pmState.domain_id as number | undefined;
      if (!domainId) return { id: row.id, result: "no_domain_id" };

      const dnsWrittenAt = new Date(row.updated_at as string).getTime();
      const ageMs = now - dnsWrittenAt;
      const userEmail = await getUserEmail(admin, row.id);

      let dkimVerified = false;
      try {
        const d = await pm.verifyDkim(domainId);
        dkimVerified = d.dkimVerified;
      } catch (e) {
        console.error(
          `[cron/check-dkim-status] verifyDkim failed for ${row.domain}:`,
          e,
        );
        return { id: row.id, result: "verify_error" };
      }

      if (dkimVerified) {
        const newPmState = { ...pmState, dkim_verified: true };
        // Advance to brevo_done.
        await admin
          .from("setup_runs")
          .update({
            status: "brevo_done",
            cf_state: {
              ...((row.cf_state as Record<string, unknown>) ?? {}),
              postmark: newPmState,
            },
          })
          .eq("id", row.id);

        // Email if user is inactive (last_active_at > 5 min ago or null) OR explicitly requested.
        const lastActive = row.last_active_at
          ? new Date(row.last_active_at as string).getTime()
          : 0;
        const userInactive = now - lastActive > 5 * 60 * 1000;
        if (userInactive && userEmail) {
          await sendDkimReadyEmail({
            toEmail: userEmail,
            domain: row.domain,
            finishUrl: `${SITE_URL}/en/app/setup`,
          });
        }
        return { id: row.id, result: "verified" };
      }

      // Not yet verified — send delay emails if thresholds crossed.
      const results: string[] = ["not_verified"];

      if (ageMs > 15 * 60 * 1000 && !row.dkim_notify_15m_sent_at && userEmail) {
        await sendDkimDelayedEmail({
          toEmail: userEmail,
          domain: row.domain,
          finishUrl: `${SITE_URL}/en/app/setup`,
          isVeryLong: false,
        });
        await admin
          .from("setup_runs")
          .update({ dkim_notify_15m_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        results.push("15m_email_sent");
      }

      if (ageMs > 30 * 60 * 1000 && !row.dkim_notify_30m_sent_at && userEmail) {
        await sendDkimDelayedEmail({
          toEmail: userEmail,
          domain: row.domain,
          finishUrl: `${SITE_URL}/en/app/setup`,
          isVeryLong: true,
        });
        await admin
          .from("setup_runs")
          .update({ dkim_notify_30m_sent_at: new Date().toISOString() })
          .eq("id", row.id);
        results.push("30m_email_sent");
      }

      return { id: row.id, result: results.join("+") };
    }),
  );

  const summary = outcomes.map((o) =>
    o.status === "fulfilled" ? o.value : { result: "exception" },
  );
  console.log("[cron/check-dkim-status]", JSON.stringify(summary));
  return NextResponse.json({ checked: rows.length, summary });
}

async function getUserEmail(
  admin: ReturnType<typeof createServiceClient>,
  runId: string,
): Promise<string | null> {
  // Join setup_runs → purchases via domain or user_id to find the email.
  const { data } = await admin
    .from("setup_runs")
    .select("user_id, domain")
    .eq("id", runId)
    .maybeSingle();
  if (!data) return null;

  const { data: purchase } = await admin
    .from("purchases")
    .select("user_email")
    .contains("custom_data", { domain: data.domain })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return purchase?.user_email ?? null;
}
