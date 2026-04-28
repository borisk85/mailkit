import "server-only";

import { brandedEmailContent } from "./email-wrapper";

/**
 * Brevo transactional email — one-shot sender using the same API key
 * as the sender-domain setup in brevo.ts. Distinct from brevo.ts
 * because the concerns are different: that file manages sender
 * domains; this file emits outbound messages.
 *
 * Premium-pass §5: each transactional message ships both text and an
 * HTML wrapper from `email-wrapper.ts` (logo + brand-consistent
 * styling + footer with /terms /privacy /guarantee). Anti-spam
 * scanners read the matched plain-text body, humans see the
 * formatted HTML in their inbox.
 *
 * Endpoint: POST /v3/smtp/email
 * https://developers.brevo.com/reference/sendtransacemail
 */

const BREVO_API_BASE = process.env.BREVO_API_URL ?? "https://api.brevo.com/v3";

export class BrevoTransactionalError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(opts: { message: string; code: string; httpStatus: number }) {
    super(opts.message);
    this.name = "BrevoTransactionalError";
    this.code = opts.code;
    this.httpStatus = opts.httpStatus;
  }
}

type SendInput = {
  to: { email: string; name?: string };
  subject: string;
  textContent: string;
  htmlContent?: string;
};

/**
 * Send one transactional email through Brevo. Pulls sender identity
 * from env (MAILKIT_SUPPORT_FROM_EMAIL / MAILKIT_SUPPORT_FROM_NAME) so
 * owner can rotate the support-address domain (mailkit-test.ru today
 * → getmailkit.com at launch) without a code change.
 *
 * On any failure — missing env, missing API key, non-2xx, network —
 * this throws BrevoTransactionalError. Callers (auto-refund trigger)
 * swallow + log rather than propagate, since an email miss must not
 * cascade into a refund-trigger failure that would then look like a
 * total refund failure.
 */
export async function sendTransactionalEmail(input: SendInput): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.MAILKIT_SUPPORT_FROM_EMAIL;
  const fromName = process.env.MAILKIT_SUPPORT_FROM_NAME ?? "MailKit";

  if (!apiKey) {
    throw new BrevoTransactionalError({
      message: "BREVO_API_KEY not set",
      code: "missing_api_key",
      httpStatus: 0,
    });
  }
  if (!fromEmail) {
    throw new BrevoTransactionalError({
      message: "MAILKIT_SUPPORT_FROM_EMAIL not set",
      code: "missing_from_email",
      httpStatus: 0,
    });
  }

  const body: Record<string, unknown> = {
    sender: { email: fromEmail, name: fromName },
    to: [input.to],
    subject: input.subject,
    textContent: input.textContent,
    replyTo: { email: fromEmail, name: fromName },
  };
  if (input.htmlContent) body.htmlContent = input.htmlContent;

  const res = await fetch(`${BREVO_API_BASE}/smtp/email`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { message?: string; code?: string };
      detail = j.code ? `${j.code}: ${j.message ?? ""}` : (j.message ?? "");
    } catch {
      // ignore — body may be empty
    }
    throw new BrevoTransactionalError({
      message: detail || `Brevo transactional send failed: HTTP ${res.status}`,
      code: `http_${res.status}`,
      httpStatus: res.status,
    });
  }
}

/**
 * Humanize the internal setup step name into one sentence the user
 * can read without knowing our pipeline internals. Uses the failed
 * step as a free-text identifier rather than an enum so unexpected
 * inputs fall through to a neutral "our automation hit an issue"
 * sentence.
 */
export function humanizeFailedStep(step: string): string {
  switch (step) {
    case "enable_routing":
    case "dns_upsert":
    case "list_destinations":
    case "create_destination":
    case "list_rules":
    case "create_rule":
      return "Our Cloudflare routing setup couldn't complete on our end.";
    case "brevo_create_sender":
    case "brevo_dns_upsert":
    case "brevo_spf_merge":
    case "brevo_verify":
    case "brevo_finalize":
      return "Our Brevo SMTP authentication step couldn't complete on our end.";
    default:
      return "Our automation hit an issue we couldn't recover from.";
  }
}

/**
 * Compose + send the refund notification email. Fire-and-forget from
 * the caller's perspective — errors are surfaced via throw; caller
 * (auto-refund) logs and continues. Copy from architect-approved
 * template in the etap-1 directive.
 */
export async function sendAutoRefundEmail(args: {
  toEmail: string;
  toName?: string;
  failedStep: string;
}): Promise<void> {
  const { toEmail, toName, failedStep } = args;

  const subject = "MailKit setup failed — full refund issued";

  const humanReason = humanizeFailedStep(failedStep);

  const textContent = [
    "Hi,",
    "",
    "Our automated setup for your domain couldn't complete. We've issued a full refund to your original payment method — it'll return to your card within 3–10 business days.",
    "",
    `What happened: ${humanReason}`,
    "",
    "If you'd like to try again once we've resolved our side, we'll let you know. Questions? Just reply to this email.",
    "",
    "— MailKit support",
  ].join("\n");

  await sendTransactionalEmail({
    to: { email: toEmail, name: toName },
    subject,
    textContent,
  });
}

/**
 * Notify customer that their domain hit a rate limit and sending was
 * paused. Copy from docs/TECH_ABUSE_MITIGATIONS.md §2.4. Throws on
 * Brevo failure so the caller can record an "email_failed" abuse_events
 * row — but auto-suspension itself never blocks on email delivery.
 */
export async function sendSendLimitBlockEmail(args: {
  toEmail: string;
  toName?: string;
  domain: string;
  /** "day" | "hour" | "minute" — already formatted for the locale. */
  period: string;
  observed: number;
  limit: number;
  /** Auto-resume window in human-readable form ("when the day bucket
   * resets at midnight UTC", "in the next hour", etc.). */
  resumeHint: string;
}): Promise<void> {
  const { toEmail, toName, domain, period, observed, limit, resumeHint } = args;

  const subject = `Sending from ${domain} temporarily paused`;

  const textContent = [
    "Hi,",
    "",
    `We've temporarily paused sending from ${domain} because ${observed} messages were sent in the last ${period}, which is over our limit of ${limit}.`,
    "",
    "The limit protects every MailKit customer — without it a single bad sender can hurt deliverability for everyone on the shared infrastructure.",
    "",
    "If you need a higher limit for legitimate sending (transactional volume, opted-in newsletter, etc.), reply to this email with a quick description of the use case. We typically raise limits within 24 hours for clear cases.",
    "",
    `Sending will resume automatically ${resumeHint}.`,
    "",
    "— MailKit",
  ].join("\n");

  const branded = brandedEmailContent({
    title: subject,
    textContent,
    preheader: `Sending from ${domain} paused — limit reached`,
  });

  await sendTransactionalEmail({
    to: { email: toEmail, name: toName },
    subject,
    textContent: branded.textContent,
    htmlContent: branded.htmlContent,
  });
}

/**
 * Notify customer that complaint or bounce rates breached the
 * deliverability threshold and the domain has been suspended in our
 * system. Copy from docs/TECH_ABUSE_MITIGATIONS.md §3.3.
 */
export async function sendDeliverabilitySuspendEmail(args: {
  toEmail: string;
  toName?: string;
  domain: string;
  /** "complaint" | "bounce" — picks the lead sentence. */
  kind: "complaint" | "bounce";
  /** Observed rate as percentage (e.g. 0.13 → "0.13%"). */
  observedRate: number;
  thresholdRate: number;
}): Promise<void> {
  const { toEmail, toName, domain, kind, observedRate, thresholdRate } = args;

  const subject = `Deliverability issue on ${domain}`;

  const headline =
    kind === "complaint"
      ? `Over the last 7 days the spam-complaint rate on messages from ${domain} reached ${formatPct(observedRate)} — above our threshold of ${formatPct(thresholdRate)}.`
      : `Over the last 7 days the bounce rate on messages from ${domain} reached ${formatPct(observedRate)} — above our threshold of ${formatPct(thresholdRate)}.`;

  const textContent = [
    "Hi,",
    "",
    `${headline} We've temporarily paused sending from this domain to protect the deliverability of our shared infrastructure.`,
    "",
    "Common causes of high complaint or bounce rates:",
    "- Sending to a stale or purchased contact list",
    "- Recipients who didn't clearly opt in to your mail",
    "- Missing or hidden unsubscribe link",
    "- Subject / content that doesn't match what recipients expect",
    "",
    "Recommendations:",
    "1. Mail only confirmed-consent contacts (double opt-in works best)",
    "2. Include a visible unsubscribe link in every send",
    "3. Warm new domains gradually — under 50/day in the first week",
    "",
    "If you believe this pause is in error, reply to this email and we'll review.",
    "",
    "— MailKit",
  ].join("\n");

  const branded = brandedEmailContent({
    title: subject,
    textContent,
    preheader: `Deliverability pause on ${domain}`,
  });

  await sendTransactionalEmail({
    to: { email: toEmail, name: toName },
    subject,
    textContent: branded.textContent,
    htmlContent: branded.htmlContent,
  });
}

/**
 * Soft-warning email when only the unsubscribe rate is over its
 * threshold. Sending is NOT paused; this is a heads-up so the
 * customer can act before complaint or bounce rates climb too.
 */
export async function sendDeliverabilityWarnEmail(args: {
  toEmail: string;
  toName?: string;
  domain: string;
  observedRate: number;
  thresholdRate: number;
}): Promise<void> {
  const { toEmail, toName, domain, observedRate, thresholdRate } = args;

  const subject = `Heads up: high unsubscribe rate on ${domain}`;

  const textContent = [
    "Hi,",
    "",
    `Over the last 7 days, ${formatPct(observedRate)} of recipients unsubscribed from messages sent via ${domain}. That's above our heads-up threshold of ${formatPct(thresholdRate)}.`,
    "",
    "We aren't pausing your domain — this is informational. But it's a useful early signal: when unsubscribe rates climb, complaint rates often follow, and complaints can lead to a hard pause.",
    "",
    "Worth a check:",
    "- Are recipients getting what they expected from you?",
    "- Is your unsubscribe link easy to find?",
    "- Is your sending cadence what they signed up for?",
    "",
    "Reply to this email if you'd like a hand reviewing the list.",
    "",
    "— MailKit",
  ].join("\n");

  const branded = brandedEmailContent({
    title: subject,
    textContent,
    preheader: `Unsubscribe rate climbing on ${domain}`,
  });

  await sendTransactionalEmail({
    to: { email: toEmail, name: toName },
    subject,
    textContent: branded.textContent,
    htmlContent: branded.htmlContent,
  });
}

function formatPct(rate: number): string {
  if (!Number.isFinite(rate) || rate < 0) return "0%";
  // Two decimal places so 0.1% threshold reads as "0.10%" not "0%".
  return `${rate.toFixed(2)}%`;
}
