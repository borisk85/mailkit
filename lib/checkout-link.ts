import "server-only";

import type { createServiceClient } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createServiceClient>;

const LINK_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Link an orphan (user_id NULL) purchase to the current Supabase user.
 *
 * Why this exists: the landing first-buy CTA lands the customer on LS
 * directly, unauth. The order_created webhook writes a purchases row
 * with user_id=NULL and user_email=<the email LS captured at
 * checkout>. After the LS thank-you page bounces the buyer back to
 * /app/setup?paid=1, they complete OAuth (or are already signed in
 * from a prior session) — and only at that moment do we know the
 * Supabase user.id that this purchase belongs to. This helper
 * performs the heuristic match: same email + recent created_at
 * window + status=paid + user_id still NULL.
 *
 * Preferred path: `lsOrderIdentifier` is supplied (from the LS
 * redirect URL). Exact match bypasses the timestamp window entirely
 * because the identifier is authoritative. Fallback path: email +
 * 1-hour recency window. One hour covers the realistic "user got
 * distracted mid-OAuth" case without risking cross-purchase aliasing
 * for repeat buyers.
 *
 * Idempotent: runs every time the user visits /app/setup?paid=1. If
 * there's no orphan purchase to link, it's a no-op. If the purchase
 * was already linked on a previous visit (user_id set), the scoped
 * filter excludes it.
 */
export async function linkOrphanPurchase(args: {
  admin: AdminClient;
  userId: string;
  userEmail: string;
  lsOrderIdentifier?: string | null;
}): Promise<{ linked: boolean; purchaseId?: string }> {
  const { admin, userId, userEmail, lsOrderIdentifier } = args;

  if (!userEmail) return { linked: false };

  // Preferred: exact identifier match. LS passes order_number (or
  // similar) on the thank-you redirect; architect wired it through as
  // `order_id` in our query-string contract.
  if (lsOrderIdentifier) {
    const { data: exact } = await admin
      .from("purchases")
      .select("id, user_id, user_email")
      .eq("ls_order_identifier", lsOrderIdentifier)
      .maybeSingle();

    if (exact && !exact.user_id && matchesEmail(exact.user_email, userEmail)) {
      const { error } = await admin
        .from("purchases")
        .update({ user_id: userId })
        .eq("id", exact.id);
      if (!error) {
        console.info(
          `[checkout-link] linked purchase ${exact.id} to user ${userId} via exact identifier ${lsOrderIdentifier}`,
        );
        return { linked: true, purchaseId: exact.id };
      }
      console.error(
        `[checkout-link] exact-match link failed for purchase ${exact.id}: ${error.message}`,
      );
    }
  }

  // Fallback: email + recency window. Limit to the most recent candidate
  // — multiple orphans for the same email within an hour shouldn't
  // happen at MVP scale, but if they do, linking the most recent is
  // the safer default (that's the one the user just paid for).
  const { data: candidates } = await admin
    .from("purchases")
    .select("id, user_email, created_at")
    .is("user_id", null)
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(5);

  if (!candidates || candidates.length === 0) return { linked: false };

  const cutoff = Date.now() - LINK_WINDOW_MS;
  const match = candidates.find((p) => {
    if (!matchesEmail(p.user_email, userEmail)) return false;
    const ts = p.created_at ? Date.parse(p.created_at) : NaN;
    return Number.isFinite(ts) && ts >= cutoff;
  });

  if (!match) return { linked: false };

  const { error } = await admin
    .from("purchases")
    .update({ user_id: userId })
    .eq("id", match.id);

  if (error) {
    console.error(
      `[checkout-link] link failed for purchase ${match.id}: ${error.message}`,
    );
    return { linked: false };
  }

  console.info(
    `[checkout-link] linked purchase ${match.id} to user ${userId} via email+recency match`,
  );
  return { linked: true, purchaseId: match.id };
}

function matchesEmail(a: string | null | undefined, b: string): boolean {
  if (!a) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
