import "server-only";

import type { createServiceClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createServiceClient>;

/**
 * Grace window between a soft-delete (profiles.deleted_at stamped) and
 * the hard purge. Signing in anytime before this elapses cancels the
 * deletion; the purge cron removes accounts past it.
 */
export const DELETION_GRACE_DAYS = 30;

/**
 * If the user has a pending soft-delete (deleted_at set), clear it.
 * Called on every authenticated /app load — a returning user is, by
 * definition, undoing their deletion. Best-effort: a failure here must
 * not block the dashboard, so callers ignore the return value on error.
 *
 * Returns true if a pending deletion was actually cancelled.
 */
export async function reactivateIfPendingDeletion(
  admin: AdminClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("profiles")
    .select("deleted_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.deleted_at) return false;

  const { error: updErr } = await admin
    .from("profiles")
    .update({ deleted_at: null })
    .eq("id", userId);

  if (updErr) {
    console.error(
      `[account-lifecycle] reactivate failed for ${userId}: ${updErr.message}`,
    );
    return false;
  }

  console.info(
    `[account-lifecycle] reactivated ${userId} — cancelled pending deletion`,
  );
  return true;
}
