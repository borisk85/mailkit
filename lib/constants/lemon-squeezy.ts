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
