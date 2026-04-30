import { NextResponse } from "next/server";

import { SES_STATUS } from "@/lib/integrations/ses";
import { sendDomainVerifiedEmail } from "@/lib/integrations/brevo-transactional";
import {
  pollDomainVerification,
  createSmtpCredentialsForTenant,
} from "@/lib/integrations/ses";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * SES DKIM verification polling cron.
 *
 * Runs every 60 seconds via Vercel Cron. Finds all setup_runs with
 * status ses_dkim_pending, polls SES for DKIM status, and when verified:
 *   1. Creates per-tenant IAM SMTP credentials
 *   2. Saves credentials to ses_state JSONB
 *   3. Advances run status to ses_done
 *   4. Fires "domain verified" transactional email with deep link
 *
 * Per-run failures are logged and skipped — one bad run does not abort
 * the whole batch. Auth matches other cron routes (CRON_SECRET).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/ses-verify] CRON_SECRET not configured");
    return new NextResponse("Cron secret not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createServiceClient();

  const { data: pendingRuns, error } = await admin
    .from("setup_runs")
    .select("id, user_id, domain, ses_state")
    .eq("status", SES_STATUS.dkimPending)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("[cron/ses-verify] DB query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const runs = pendingRuns ?? [];
  const results = {
    total: runs.length,
    verified: 0,
    stillPending: 0,
    failed: 0,
  };

  for (const run of runs) {
    try {
      const verifyResult = await pollDomainVerification(run.id, run.domain);

      if (verifyResult.verificationStatus !== "SUCCESS") {
        results.stillPending++;
        continue;
      }

      // DKIM verified — issue SMTP credentials.
      const sesState = ((run.ses_state as Record<string, unknown>) ??
        {}) as Record<string, unknown>;
      const identityArn =
        (sesState.identity as Record<string, string> | undefined)
          ?.identityArn ??
        `arn:aws:ses:${process.env.AWS_SES_REGION ?? "us-east-1"}:${process.env.AWS_ACCOUNT_ID ?? ""}:identity/${run.domain}`;

      const smtpCreds = await createSmtpCredentialsForTenant(
        run.id,
        identityArn,
      );

      const nextSesState = {
        ...sesState,
        smtp: {
          host: smtpCreds.host,
          port: smtpCreds.port,
          username: smtpCreds.username,
          password: smtpCreds.password,
          securityMode: smtpCreds.securityMode,
          keyVersion: 1,
        },
        iamUsername: smtpCreds.iamUsername,
        dkimVerifiedAt: new Date().toISOString(),
        credentialsIssuedAt: new Date().toISOString(),
      };

      await admin
        .from("setup_runs")
        .update({ status: SES_STATUS.done, ses_state: nextSesState })
        .eq("id", run.id);

      // Notify customer — fire-and-forget.
      const { data: profile } = await admin
        .from("profiles")
        .select("email")
        .eq("id", run.user_id)
        .maybeSingle();

      const email = (profile as { email?: string } | null)?.email;
      if (email) {
        sendDomainVerifiedEmail({
          toEmail: email,
          domain: run.domain,
          runId: run.id,
        }).catch((err) =>
          console.error(
            `[cron/ses-verify] email failed for run ${run.id}:`,
            err,
          ),
        );
      }

      results.verified++;
    } catch (e) {
      results.failed++;
      console.error(
        `[cron/ses-verify] run ${run.id} (${run.domain}) failed:`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  console.log("[cron/ses-verify]", results);
  return NextResponse.json(results);
}
