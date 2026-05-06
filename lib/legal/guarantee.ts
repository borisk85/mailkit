/**
 * Canonical refund-guarantee text — EN only. Source of truth lives
 * in `docs/GUARANTEE_POLICY.md` "Formal policy" EN canonical block.
 * Architect directive: copy verbatim, no paraphrase.
 *
 * Required by:
 *   - Hero "(see policy)" link → `/{locale}/guarantee`
 *   - llms.txt manifest entry
 *   - JSON-LD structured-data descriptions reference the guarantee
 *   - /terms section 3 mentions /guarantee for the full text
 *   - Receipt email (post-launch via #47) signs off with the link
 *
 * Last sync with docs/GUARANTEE_POLICY.md: 2026-04-28.
 */

export const GUARANTEE_EN = `MailKit Guarantee

1. Automation Failure Refund (automatic). If our automated setup of
Cloudflare Email Routing or Postmark SMTP fails to complete for your
domain within the combined automation phase (typically under 2
minutes), we issue a full refund automatically within 24 hours of
the failure. No action required on your part. The automation phase
is measured server-side from the start of setup to the completion
of the SMTP verification step. Failure means our system returned
an error and did not reach the Gmail wizard phase.

2. 30-Day Functional Guarantee (by request). If, within 30 days of
purchase, you cannot send or receive email through the setup we
configured — even after we've attempted to assist you via support
— you are entitled to a full refund. Submit a request to
support@getmailkit.com describing the issue. We respond within 48
hours on business days.

What is not covered:

- Time you spend on the Gmail Send-As guided step. We provide a
  step-by-step wizard with copy-paste fields; the actual clicks
  happen in your Gmail account, at your pace.
- Failures caused by changes you make to DNS records, Cloudflare
  settings, or Gmail account settings after setup completion.
- Email deliverability issues (messages marked as spam by
  recipients, reputation problems). These are addressed by our
  optional Deliverability Monitoring subscription ($3/month per
  domain).
- Failures caused by your domain expiration, registrar changes, or
  account suspensions at third-party services (Cloudflare, Postmark,
  Google) outside our control.

How refunds are processed: Refunds are issued through the original
payment method via Lemon Squeezy. Processing time depends on your
card issuer, typically 3-10 business days.

Fraud note: We track refund requests per account. Multiple refund
requests from the same account may result in account restriction.
`;
