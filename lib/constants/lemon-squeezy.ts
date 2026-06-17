/**
 * Lemon Squeezy checkout URL for the MailKit Email Setup ($5 one-time)
 * product.
 *
 * The product lives in the owner's `vibecraftstudio` Lemon Squeezy
 * store (host `vibecraftstudio.lemonsqueezy.com`). NOTE: the earlier
 * `velabot.lemonsqueezy.com` store no longer exists — any link to it
 * 404s, which silently kills the whole paid flow. Keep this host in
 * sync with the live store. Post-launch plan (dedicated MailKit store
 * or a `checkout.getmailkit.com` custom domain) → [docs/TICKETS_BACKLOG.md].
 *
 * All landing CTAs (hero, pricing, final) and the post-payment redirect
 * target this one URL — one product, one price, one flow, three entry
 * points per `docs/LANDING_SPEC_V1.md` section 1.3.
 */
export const LEMON_SQUEEZY_CHECKOUT_URL =
  "https://vibecraftstudio.lemonsqueezy.com/checkout/buy/7d622a10-5167-452f-930a-7c1ce559d56a";

/**
 * First-100 launch promo (#33). The discount code itself is created
 * by the owner in the Lemon Squeezy dashboard ahead of launch — set
 * to 100% off, capped at 100 uses. Until the code exists in LS, the
 * `?checkout[discount_code]=FIRST25` query param simply has no
 * effect (LS surfaces "code not found" inline on the checkout page),
 * so this code is safe to ship before the dashboard configuration
 * lands.
 */
export const FIRST_100_DISCOUNT_CODE = "FIRST25";

/**
 * Append the first-100 discount code to a Lemon Squeezy checkout URL.
 * Idempotent — calling with an already-coded URL leaves the existing
 * value alone. Honors the LS `checkout[discount_code]` square-bracket
 * convention; the param survives URL.searchParams.set encoding because
 * LS accepts both literal and percent-encoded brackets.
 */
export function withFirst100Discount(url: string): string {
  try {
    const parsed = new URL(url);
    const key = "checkout[discount_code]";
    if (parsed.searchParams.has(key)) return url;
    parsed.searchParams.set(key, FIRST_100_DISCOUNT_CODE);
    return parsed.toString();
  } catch {
    // Invalid URL — return unchanged rather than throw; the broken
    // URL was already broken, no point making the failure louder.
    return url;
  }
}
