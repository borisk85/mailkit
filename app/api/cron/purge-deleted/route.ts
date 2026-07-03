import { NextResponse } from "next/server";

import { DELETION_GRACE_DAYS } from "@/lib/account-lifecycle";
import { runCron } from "@/lib/cron-alert";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Daily purge of soft-deleted accounts past the grace window.
 *
 * deleteAccount() stamps profiles.deleted_at instead of hard-deleting.
 * Signing back in clears the flag (account-lifecycle reactivation). This
 * cron finds profiles whose deleted_at is older than DELETION_GRACE_DAYS
 * and hard-deletes the auth.users row, which cascades:
 *   - profiles  → ON DELETE CASCADE (row gone)
 *   - setup_runs → ON DELETE CASCADE (all runs gone)
 *   - purchases  → ON DELETE SET NULL (revenue audit rows survive)
 *
 * Auth: Vercel Cron sets `Authorization: Bearer <CRON_SECRET>`. Anything
 * else → 401. Per-user failures don't abort the run; the route returns a
 * 200 summary with any errors for the Vercel runtime logs.
 */
export async function GET(request: Request) {
  return runCron("purge-deleted", () => handler(request));
}

async function handler(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/purge-deleted] CRON_SECRET not configured");
    return new NextResponse("Cron secret not configured", { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createServiceClient();
  const cutoff = new Date(
    Date.now() - DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: expired, error } = await admin
    .from("profiles")
    .select("id")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (error) {
    console.error("[cron/purge-deleted] profiles load failed", error);
    return new NextResponse("DB error", { status: 500 });
  }

  let purged = 0;
  const errors: string[] = [];
  for (const row of expired ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id);
    if (delErr) {
      errors.push(`${row.id}: ${delErr.message}`);
      console.error(
        `[cron/purge-deleted] deleteUser failed for ${row.id}: ${delErr.message}`,
      );
    } else {
      purged += 1;
    }
  }

  return NextResponse.json(
    { checked: expired?.length ?? 0, purged, errors },
    { status: 200 },
  );
}
