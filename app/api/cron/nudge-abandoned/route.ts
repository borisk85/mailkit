import { NextResponse } from "next/server";

import { sendAbandonedSetupEmail } from "@/lib/integrations/postmark-transactional";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Cron — runs daily at 10:00 UTC.
 *
 * Finds paid purchases where:
 *   - created 24–72 hours ago (give them a day before nudging)
 *   - no completed setup_run for that user
 *   - abandoned_nudge_sent_at IS NULL (send exactly once)
 *
 * Sends a "your setup is waiting" email and stamps abandoned_nudge_sent_at.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/nudge-abandoned] CRON_SECRET not configured");
    return new NextResponse("Cron secret not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createServiceClient();

  // Purchases in the 24–72h window with no nudge sent yet.
  const { data: purchases, error } = await admin
    .from("purchases")
    .select("id, user_id, user_email, created_at")
    .eq("status", "paid")
    .is("abandoned_nudge_sent_at", null)
    .gte("created_at", new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
    .lte(
      "created_at",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );

  if (error) {
    console.error("[cron/nudge-abandoned] DB error:", error.message);
    return new NextResponse("DB error", { status: 500 });
  }

  if (!purchases || purchases.length === 0) {
    return NextResponse.json({ nudged: 0 });
  }

  const outcomes = await Promise.allSettled(
    purchases.map(async (p) => {
      // Skip if the user has already completed setup.
      if (p.user_id) {
        const { data: done } = await admin
          .from("setup_runs")
          .select("id")
          .eq("user_id", p.user_id)
          .eq("status", "done")
          .limit(1)
          .maybeSingle();
        if (done) {
          return { id: p.id, result: "already_done" };
        }
      }

      await sendAbandonedSetupEmail({ toEmail: p.user_email });

      const { error: stampError } = await admin
        .from("purchases")
        .update({ abandoned_nudge_sent_at: new Date().toISOString() })
        .eq("id", p.id);

      if (stampError) {
        console.error(
          "[cron/nudge-abandoned] stamp failed:",
          stampError.message,
        );
        throw new Error(`stamp failed: ${stampError.message}`);
      }

      return { id: p.id, result: "nudged" };
    }),
  );

  const summary = outcomes.map((o) =>
    o.status === "fulfilled" ? o.value : { result: "exception" },
  );
  console.log("[cron/nudge-abandoned]", JSON.stringify(summary));
  return NextResponse.json({ nudged: purchases.length, summary });
}
