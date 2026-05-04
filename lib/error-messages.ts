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

  // SMTP
  "setup.errors.smtp_misconfigured":
    "SMTP credentials aren't configured on our end. Contact support.",
  "setup.errors.postmark_invalid_token":
    "SMTP provider rejected the API key. Contact support.",
  "setup.errors.postmark_unavailable":
    "SMTP provider is temporarily unavailable. Try again in a few minutes.",

  // State
  "state.suspended_by_owner":
    "This domain has been suspended. Email support@getmailkit.com.",
};

const PATTERN_TO_FRIENDLY: Array<[RegExp, string]> = [
  [
    /token/i,
    "Invalid Cloudflare API token. Create a new one with the required permissions.",
  ],
  [/rate.?limit/i, "Too many requests. Wait a minute and try again."],
  [/timeout/i, "Request timed out. Check your connection and try again."],
  [/dns/i, "DNS update failed. Wait a few minutes for propagation and retry."],
  [/auth/i, "Authentication failed. Sign in again."],
];

export function friendlyErrorMessage(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  const exact = RAW_TO_FRIENDLY[raw.trim()];
  if (exact) return exact;

  for (const [pattern, msg] of PATTERN_TO_FRIENDLY) {
    if (pattern.test(raw)) return msg;
  }

  // Last resort: strip internal codes, keep human fragment if present
  const stripped = raw
    .replace(/^(Error|setup\.errors\.|smtp_|postmark_|cf_)[^\s]*/i, "")
    .replace(/\{[^}]*\}/g, "")
    .trim();

  return stripped.length > 5
    ? stripped
    : "Setup failed. Contact support@getmailkit.com.";
}
