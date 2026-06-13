"use server";

import { revalidatePath } from "next/cache";

import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Account-zone server actions for the /app dashboard. The destructive
 * delete-account flow lives here rather than in setup/actions.ts
 * because it spans more than the setup pipeline (profiles +
 * setup_runs + auth.users) and needs the service-role client to
 * cascade through auth.users.
 */

/**
 * Soft-delete the calling user's account (Google-style grace period).
 *
 * Instead of hard-deleting auth.users immediately, we stamp
 * profiles.deleted_at and sign the user out. Nothing is destroyed yet:
 *   - Signing back in clears deleted_at (see reactivateIfPendingDeletion
 *     in the /app layout) — an accidental delete is fully reversible.
 *   - The purge cron (/api/cron/purge-deleted) hard-deletes profiles
 *     whose deleted_at is older than DELETION_GRACE_DAYS, which cascades
 *     auth.users → setup_runs and SET NULLs the surviving purchase rows
 *     (financial audit trail; revenue records are never destroyed).
 *
 * The user-session client first verifies "yes, the caller really is
 * the user they claim to be" — service-role bypasses RLS so we MUST
 * not trust a caller-provided id.
 */
export async function deleteAccount(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Not authenticated");
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    throw new Error(`Account deletion failed: ${error.message}`);
  }

  // Sign the user out so the account immediately appears gone. The
  // profiles row + their data stay in place until the grace period
  // elapses; a fresh sign-in reactivates everything.
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore — redirect to landing happens client-side regardless.
  }
}

/**
 * #DASH-3 — Delete a single failed setup_run. Only the owner can
 * delete their own runs; the RLS policy enforces this via the
 * user-session client check below.
 */
export async function deleteFailedSetup(runId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    throw new Error("Not authenticated");
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from("setup_runs")
    .delete()
    .eq("id", runId)
    .eq("user_id", user.id)
    .eq("status", "failed");

  if (error) {
    throw new Error(`Failed to delete setup: ${error.message}`);
  }

  revalidatePath("/", "layout");
}
