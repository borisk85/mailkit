/**
 * #ABUSE-3 — lightweight phishing pattern detection.
 *
 * Runs at prepareGmailStep (after payment, before Gmail walkthrough).
 * A match flags the purchase for manual KYC review; it does NOT block
 * the setup automatically.
 *
 * Two checks:
 *   1. SUSPICIOUS_NAMES — reserved/impersonation mailbox prefixes
 *   2. Levenshtein distance ≤ 1 from a top-brand domain name
 */

export type PhishingCheckResult =
  | { flagged: false }
  | { flagged: true; reason: string };

// Domains we own and operate. Owner mailboxes (support@, admin@, …) on these
// are legitimate by definition, so they must never trip phishing detection.
const OWN_DOMAINS = ["getmailkit.com"];

// Mailbox prefixes that are almost always either impersonation or spam.
const SUSPICIOUS_NAMES = new Set([
  "noreply",
  "no-reply",
  "donotreply",
  "do-not-reply",
  "support",
  "admin",
  "administrator",
  "help",
  "info",
  "contact",
  "billing",
  "payments",
  "sales",
  "legal",
  "abuse",
  "postmaster",
  "mailer-daemon",
  "security",
  "verify",
  "verification",
  "secure",
  "account",
  "accounts",
  "update",
  "updates",
  "service",
  "alert",
  "alerts",
  "notification",
  "notifications",
]);

// Well-known brand SLDs for Levenshtein typosquatting detection.
const TOP_BRANDS = [
  "paypal",
  "google",
  "apple",
  "microsoft",
  "amazon",
  "facebook",
  "meta",
  "instagram",
  "twitter",
  "netflix",
  "spotify",
  "cloudflare",
  "stripe",
  "shopify",
  "github",
  "gitlab",
  "linkedin",
  "zoom",
  "dropbox",
  "slack",
  "binance",
  "coinbase",
  "chase",
  "wellsfargo",
  "citibank",
  "bankofamerica",
  "hsbc",
  "barclays",
  "wise",
  "revolut",
];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Extract the second-level domain label from a hostname.
 * "mail.paypa1.com" → "paypa1"
 */
function sld(domain: string): string {
  const parts = domain.toLowerCase().replace(/\.+$/, "").split(".");
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

export function checkPhishingPattern(
  mailboxLocal: string,
  domain: string,
): PhishingCheckResult {
  const host = domain.toLowerCase().replace(/\.+$/, "");
  if (OWN_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return { flagged: false };
  }

  const local = mailboxLocal.toLowerCase().replace(/[._-]/g, "");

  if (
    SUSPICIOUS_NAMES.has(local) ||
    SUSPICIOUS_NAMES.has(mailboxLocal.toLowerCase())
  ) {
    return {
      flagged: true,
      reason: `reserved mailbox name: "${mailboxLocal}"`,
    };
  }

  const domainSld = sld(domain);
  for (const brand of TOP_BRANDS) {
    if (levenshtein(domainSld, brand) <= 1 && domainSld !== brand) {
      return {
        flagged: true,
        reason: `domain typosquatting: "${domain}" is 1 edit from "${brand}.com"`,
      };
    }
  }

  return { flagged: false };
}
