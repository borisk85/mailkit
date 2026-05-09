/**
 * Lemon Squeezy checkout URL for the MailKit Email Setup ($5 one-time)
 * product.
 *
 * The product currently lives in the owner's `velabot` Lemon Squeezy
 * store — LS blocks second-store creation on a single account without
 * a support contact, so MVP launch uses the existing store rather than
 * waiting on LS support. The `velabot.lemonsqueezy.com` host in the URL
 * is a known-and-accepted optics trade-off; see
 * [docs/TICKETS_BACKLOG.md](../../docs/TICKETS_BACKLOG.md) "Tech debt →
 * LS checkout store migration" for the post-launch plan (either a
 * dedicated MailKit store or a custom `checkout.getmailkit.com` domain
 * mapped to the velabot store).
 *
 * All landing CTAs (hero, pricing, final) and the post-payment redirect
 * target this one URL — one product, one price, one flow, three entry
 * points per `docs/LANDING_SPEC_V1.md` section 1.3.
 */
export const LEMON_SQUEEZY_CHECKOUT_URL =
  "https://velabot.lemonsqueezy.com/checkout/buy/7d622a10-5167-452f-930a-7c1ce559d56a";

/**
 * First-100 launch promo (#33). The discount code itself is created
 * by the owner in the Lemon Squeezy dashboard ahead of launch — set
 * to 100% off, capped at 100 uses. Until the code exists in LS, the
 * `?checkout[discount_code]=FIRST100` query param simply has no
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
