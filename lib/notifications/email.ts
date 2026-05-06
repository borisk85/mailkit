import { brandedEmailContent } from "@/lib/integrations/email-wrapper";

const POSTMARK_API = "https://api.postmarkapp.com/email";

async function sendViaPostmarkTransactional(opts: {
  to: string;
  subject: string;
  title: string;
  body: string;
  cta?: { text: string; url: string };
}) {
  const token = process.env.POSTMARK_TRANSACTIONAL_SERVER_TOKEN;
  const from =
    process.env.POSTMARK_DEFAULT_FROM_EMAIL ?? "noreply@getmailkit.com";
  if (!token) return;

  const { htmlContent: html } = brandedEmailContent({
    title: opts.title,
    textContent: opts.body,
    cta: opts.cta,
  });
  const text =
    opts.body + (opts.cta ? `\n\n${opts.cta.text}: ${opts.cta.url}` : "");

  await fetch(POSTMARK_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: from,
      To: opts.to,
      Subject: opts.subject,
      HtmlBody: html,
      TextBody: text,
      MessageStream: "outbound",
    }),
  }).catch((e) => console.error("[email] send failed:", e));
}

export async function sendDkimReadyEmail(opts: {
  toEmail: string;
  domain: string;
  finishUrl: string;
}) {
  await sendViaPostmarkTransactional({
    to: opts.toEmail,
    subject: "Domain ready — finish your MailKit setup",
    title: "Your domain is verified",
    body: `Good news! ${opts.domain} has been verified with our email provider. Click below to complete the final step — it takes about 3 minutes in Gmail settings.`,
    cta: { text: "Finish setup in Gmail →", url: opts.finishUrl },
  });
}

export async function sendDkimDelayedEmail(opts: {
  toEmail: string;
  domain: string;
  finishUrl: string;
  isVeryLong: boolean;
}) {
  const body = opts.isVeryLong
    ? `Domain verification for ${opts.domain} is taking longer than usual. This can occasionally happen depending on DNS propagation speed. We're still monitoring and will email you again when it's done. If you have questions, reply to this email or contact support@getmailkit.com.`
    : `We're still verifying ${opts.domain} with our email provider. This usually takes 5–15 minutes. You can close MailKit and we'll email you as soon as it's done.`;

  await sendViaPostmarkTransactional({
    to: opts.toEmail,
    subject: opts.isVeryLong
      ? "Verification taking longer than usual — we're on it"
      : "Still verifying your domain — almost there",
    title: opts.isVeryLong ? "Taking a bit longer" : "Still working on it",
    body,
    cta: opts.isVeryLong
      ? { text: "Check setup status →", url: opts.finishUrl }
      : undefined,
  });
}
