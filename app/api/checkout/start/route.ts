import { NextResponse } from "next/server";

import {
  FIRST_100_DISCOUNT_CODE,
  LEMON_SQUEEZY_CHECKOUT_URL,
} from "@/lib/constants/lemon-squeezy";
import { createClient } from "@/lib/supabase/server";

/**
 * Checkout-start — auth'd buy flow for users already in /app.
 *
 * Landing first-buy lands the customer on LS directly (unauth), and
 * the thank-you page links them to their Supabase user via email +
 * recent-order match. Repeat buyers (future bundle SKUs, re-setup
 * after 30 days, monitoring upsell) hit this route instead so we can
 * stamp `user_id` into LS `checkout[custom]` at the source — no
 * heuristic needed on the webhook side.
 *
 * Contract (GET):
 *   200-class:
 *     303 See Other → Location: <LS URL> with
 *       checkout[custom][user_id] = Supabase user.id
 *       checkout[email]           = Supabase user.email (pre-fill)
 *   4xx/5xx:
 *     401 — no session (frontend redirects to /auth)
 *     500 — LEMONSQUEEZY_CHECKOUT_URL not configured
 *
 * URL merging: LEMONSQUEEZY_CHECKOUT_URL may already carry LS-side
 * query params (`?discount=X`, `?aff=Y`). We preserve those and only
 * set/overwrite our two params, so owner can bake promo or affiliate
 * attribution into the env value without code edits.
 *
 * Why GET (not POST): lets a plain `<a href>` or `<Link>` in /app
 * trigger the redirect without client JS or CSRF token ceremony. The
 * handler is idempotent — it doesn't mutate DB state; the purchase
 * row is written by the LS webhook after the user pays.
 */
export async function GET() {
  // Prefer the env override (lets the owner bake promo/affiliate params
  // into the URL without a deploy); fall back to the hardcoded product URL
  // so an empty/missing env can never 500 the paid flow.
  const checkoutUrl =
    process.env.LEMONSQUEEZY_CHECKOUT_URL || LEMON_SQUEEZY_CHECKOUT_URL;

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return new NextResponse("Not authenticated", { status: 401 });
  }

  let url: URL;
  try {
    url = new URL(checkoutUrl);
  } catch {
    console.error(
      `[checkout-start] LEMONSQUEEZY_CHECKOUT_URL is not a valid URL: ${checkoutUrl}`,
    );
    return new NextResponse("Checkout URL malformed", { status: 500 });
  }

  // LS convention: bracket-keyed params. URL.searchParams.set encodes
  // the brackets as %5B / %5D — LS accepts both encoded and raw.
  url.searchParams.set("checkout[custom][user_id]", user.id);
  if (user.email) {
    // Pre-fill only — the buyer can still pay with any email; linking is
    // by user_id custom_data, so a different payment email no longer
    // strands the purchase.
    url.searchParams.set("checkout[email]", user.email);
  }
  // Apply the launch promo only on the user's FIRST purchase.
  // Repeat buyers (add-another mailbox) pay full price — one coupon per customer.
  if (!url.searchParams.has("checkout[discount_code]")) {
    const { count } = await supabase
      .from("purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "paid");
    if (!count || count === 0) {
      url.searchParams.set("checkout[discount_code]", FIRST_100_DISCOUNT_CODE);
    }
  }

  // no-store so the browser never reuses a stale redirect target (e.g. a
  // previous deploy's checkout host) — every click re-runs this handler.
  return NextResponse.redirect(url.toString(), {
    status: 303,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
