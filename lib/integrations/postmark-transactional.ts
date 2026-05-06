import "server-only";

import { brandedEmailContent } from "./email-wrapper";

/**
 * Postmark transactional email sender for MailKit's own notifications:
 * auto-refund, rate-limit blocks, deliverability warnings, etc.
 *
 * Uses a dedicated MailKit transactional Postmark server
 * (POSTMARK_TRANSACTIONAL_SERVER_TOKEN) separate from per-customer servers.
 * Matches the interface previously provided by postmark-transactional.ts so
 * callers need no logic changes.
 */

const POSTMARK_API_BASE = "https://api.postmarkapp.com";

export class PostmarkTransactionalError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(opts: { message: string; code: string; httpStatus: number }) {
    super(opts.message);
    this.name = "PostmarkTransactionalError";
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

export async function sendTransactionalEmail(input: SendInput): Promise<void> {
  const serverToken = process.env.POSTMARK_TRANSACTIONAL_SERVER_TOKEN;
  const fromEmail = process.env.MAILKIT_SUPPORT_FROM_EMAIL;
  const fromName = process.env.MAILKIT_SUPPORT_FROM_NAME ?? "MailKit";

  if (!serverToken) {
    throw new PostmarkTransactionalError({
      message: "POSTMARK_TRANSACTIONAL_SERVER_TOKEN not set",
      code: "missing_server_token",
      httpStatus: 0,
    });
  }
  if (!fromEmail) {
    throw new PostmarkTransactionalError({
      message: "MAILKIT_SUPPORT_FROM_EMAIL not set",
      code: "missing_from_email",
      httpStatus: 0,
    });
  }

  const fromFull = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const toFull = input.to.name
    ? `${input.to.name} <${input.to.email}>`
    : input.to.email;

  const body: Record<string, unknown> = {
    From: fromFull,
    To: toFull,
    Subject: input.subject,
    TextBody: input.textContent,
    ReplyTo: fromFull,
  };
  if (input.htmlContent) body.HtmlBody = input.htmlContent;

  const res = await fetch(`${POSTMARK_API_BASE}/email`, {
    method: "POST",
    headers: {
      "X-Postmark-Server-Token": serverToken,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const j = (await res.json()) as { Message?: string; ErrorCode?: number };
      detail = j.ErrorCode
        ? `${j.ErrorCode}: ${j.Message ?? ""}`
        : (j.Message ?? "");
    } catch {
      // ignore
    }
    throw new PostmarkTransactionalError({
      message:
        detail || `Postmark transactional send failed: HTTP ${res.status}`,
      code: `http_${res.status}`,
      httpStatus: res.status,
    });
  }
}

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
      return "Our SMTP authentication step couldn't complete on our end.";
    default:
      return "Our automation hit an issue we couldn't recover from.";
  }
}

export async function sendAutoRefundEmail(args: {
  toEmail: string;
  toName?: string;
  failedStep: string;
}): Promise<void> {
  const { toEmail, toName, failedStep } = args;
  const subject = "Mailkit · Refund issued — $5 setup couldn't complete";
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

export async function sendSendLimitBlockEmail(args: {
  toEmail: string;
  toName?: string;
  domain: string;
  period: string;
  observed: number;
  limit: number;
  resumeHint: string;
}): Promise<void> {
  const { toEmail, toName, domain, period, observed, limit, resumeHint } = args;
  const subject = `Mailkit · Sending from ${domain} temporarily paused`;

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

export async function sendDeliverabilitySuspendEmail(args: {
  toEmail: string;
  toName?: string;
  domain: string;
  kind: "complaint" | "bounce";
  observedRate: number;
  thresholdRate: number;
}): Promise<void> {
  const { toEmail, toName, domain, kind, observedRate, thresholdRate } = args;
  const subject = `Mailkit · Deliverability issue on ${domain}`;

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

export async function sendDeliverabilityWarnEmail(args: {
  toEmail: string;
  toName?: string;
  domain: string;
  observedRate: number;
  thresholdRate: number;
}): Promise<void> {
  const { toEmail, toName, domain, observedRate, thresholdRate } = args;
  const subject = `Mailkit · Heads up — high unsubscribe rate on ${domain}`;

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
  return `${rate.toFixed(2)}%`;
}
