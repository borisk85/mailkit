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
 * Permanently delete the calling user's account. Cascades from
 * auth.users:
 *   - profiles.id REFERENCES auth.users ON DELETE CASCADE → row gone
 *   - setup_runs.user_id REFERENCES auth.users ON DELETE CASCADE
 *     → all setup_runs rows + nested cf_state / gmail_state gone
 *   - purchases.user_id REFERENCES auth.users ON DELETE SET NULL
 *     → orphan purchase rows survive on purpose (financial audit
 *       trail; we never delete revenue records). user_email + the
 *       refunds rows attached to those purchases also survive.
 *   - refunds.run_id ON DELETE SET NULL → kept for the trail.
 *
 * The user-session client first verifies "yes, the caller really is
 * the user they claim to be" — service-role bypasses RLS so we
 * MUST not trust the caller-provided id.
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
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new Error(`Account deletion failed: ${error.message}`);
  }

  // Sign-out is best-effort: the auth.users row is gone, so the next
  // request would fail to refresh the session anyway. We still try
  // to clear the local cookie so the immediate redirect works
  // cleanly without a flash of "Welcome back, Boris" on the way out.
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore — session is already invalid server-side.
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
