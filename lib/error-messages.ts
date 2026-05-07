/**
 * #DASH-1 — Maps raw setup error keys / API error strings to
 * user-readable messages. Keeps technical details out of the UI.
 *
 * Sources of error_msg in setup_runs:
 *   - actions.ts errorKey strings (setup.errors.*)
 *   - Raw Cloudflare / Postmark API error strings stored by the pipeline
 */

const RAW_TO_FRIENDLY: Record<string, string> = {
  // Auth
  "setup.errors.not_authenticated": "Sign in again to continue.",
  "setup.errors.invalid_input":
    "Something looks wrong with your input — please try again.",
  "setup.errors.run_not_found": "Setup session not found. Start a new setup.",
  "setup.errors.run_wrong_state":
    "This step is already complete — refresh to see the latest status.",
  "setup.errors.unexpected":
    "Something went wrong on our end. Try again in a moment.",

  // Cloudflare
  "setup.errors.cf_api_error":
    "Couldn't reach Cloudflare. Check your API token and try again.",
  "setup.errors.cf_zone_not_found":
    "Domain not found in your Cloudflare account.",
  "setup.errors.cf_routing_unavailable":
    "Email Routing isn't available for this zone. Contact Cloudflare support.",
  "setup.errors.cf_dns_conflict":
    "Existing DNS records are blocking setup. Remove conflicting MX or SPF records and retry.",

  // SMTP / Postmark
  "setup.errors.smtp_misconfigured":
    "SMTP credentials aren't configured on our end. Contact support@getmailkit.com.",
  "setup.errors.postmark_invalid_token":
    "SMTP provider rejected the API key. Contact support@getmailkit.com.",
  "setup.errors.postmark_unavailable":
    "Our SMTP provider is temporarily unavailable. Try again in a few minutes.",
  "setup.errors.postmark_domain_taken":
    "Our SMTP provider already knows this domain from a previous run — we picked up the existing setup.",
  "setup.errors.postmark_rate_limited":
    "Our SMTP provider throttled our requests. Retrying shortly.",
  "setup.errors.postmark_dkim_timeout":
    "Domain verification is taking longer than usual. DNS can be slow to propagate — wait a few minutes and restart from Step 1.",
  "setup.errors.smtp_dkim_failed":
    "We had trouble verifying your domain with our SMTP partner. This usually clears up if you wait a few minutes — DNS can take time to propagate. Restart from Step 1, or contact support@getmailkit.com if it keeps failing.",
  "setup.errors.smtp_server_creation_failed":
    "We had trouble verifying your domain with our SMTP partner. This usually clears up if you wait a few minutes — DNS can take time to propagate. Restart from Step 1, or contact support@getmailkit.com if it keeps failing.",

  // State
  "state.suspended_by_owner":
    "This domain has been suspended. Email support@getmailkit.com.",
};

const CF_DNS_ERRORS = [
  "content for MX must be a hostname",
  "invalid dns record",
  "Invalid DNS record",
  "zone not found",
  "insufficient permissions",
  "record already exists",
];

const CF_DNS_FRIENDLY =
  "We had trouble configuring DNS on your domain. This usually means your Cloudflare zone has a conflicting record or the API token doesn't have the right permissions. Restart from Step 1, or contact support@getmailkit.com if it keeps failing.";

const PATTERN_TO_FRIENDLY: Array<[RegExp, string]> = [
  [
    /token/i,
    "Invalid Cloudflare API token. Create a new one with the required permissions.",
  ],
  [/rate.?limit/i, "Too many requests. Wait a minute and try again."],
  [/timeout/i, "Request timed out. Check your connection and try again."],
  [/content for (MX|CNAME|TXT|A) must be/i, CF_DNS_FRIENDLY],
  [/invalid.{0,10}dns.{0,10}record/i, CF_DNS_FRIENDLY],
  [/dns/i, "DNS update failed. Wait a few minutes for propagation and retry."],
  [/auth/i, "Authentication failed. Sign in again."],
  [/hostname/i, CF_DNS_FRIENDLY],
];

export function friendlyErrorMessage(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  const exact = RAW_TO_FRIENDLY[raw.trim()];
  if (exact) return exact;

  // Check known CF DNS error substrings before pattern matching
  const lower = raw.toLowerCase();
  if (CF_DNS_ERRORS.some((e) => lower.includes(e.toLowerCase()))) {
    return CF_DNS_FRIENDLY;
  }

  for (const [pattern, msg] of PATTERN_TO_FRIENDLY) {
    if (pattern.test(raw)) return msg;
  }

  // Last resort: strip internal codes, return generic fallback
  return "Setup hit an unexpected issue. We've logged it for review. Restart from Step 1, or contact support@getmailkit.com.";
}
