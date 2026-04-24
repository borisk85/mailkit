import "server-only";

/**
 * Brevo transactional email — one-shot sender using the same API key
 * as the sender-domain setup in brevo.ts. Distinct from brevo.ts
 * because the concerns are different: that file manages sender
 * domains; this file emits outbound messages.
 *
 * MVP scope: EN-only plaintext refund notification. RU copy deferred
 * until the first RU paid customer — per architect directive Q2.
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

  const body = {
    sender: { email: fromEmail, name: fromName },
    to: [input.to],
    subject: input.subject,
    textContent: input.textContent,
    replyTo: { email: fromEmail, name: fromName },
  };

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
