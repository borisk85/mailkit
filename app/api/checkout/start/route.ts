import { NextResponse } from "next/server";

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
  const checkoutUrl = process.env.LEMONSQUEEZY_CHECKOUT_URL;
  if (!checkoutUrl) {
    console.error("[checkout-start] LEMONSQUEEZY_CHECKOUT_URL not set");
    return new NextResponse("Checkout URL not configured", { status: 500 });
  }

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
    url.searchParams.set("checkout[email]", user.email);
  }

  return NextResponse.redirect(url.toString(), { status: 303 });
}
