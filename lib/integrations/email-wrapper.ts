import "server-only";

/**
 * Brand-consistent HTML wrapper for transactional emails per
 * UI_REVIEW_BRIEF §5. Inline styles only — most email clients
 * (especially Gmail and Outlook) strip or ignore <style> blocks.
 *
 * Layout: 560px centered card on a soft surface background, MailKit
 * logo at the top, title + body paragraphs, optional CTA button,
 * footer with /terms /privacy /guarantee links + support address.
 *
 * Inputs are plain strings; the wrapper handles HTML-escaping and
 * paragraph wrapping. Pass the same source text into both the
 * plain-text and HTML send paths so anti-spam scanners see matched
 * content (mismatched bodies are a known deliverability red flag).
 */

const SITE_URL = "https://getmailkit.com";

export type EmailCta = {
  text: string;
  url: string;
};

export type EmailFooterStrings = {
  questions: string;
  termsLabel: string;
  privacyLabel: string;
  guaranteeLabel: string;
};

const DEFAULT_FOOTER_EN: EmailFooterStrings = {
  questions:
    "Questions? Reply to this email or write to support@getmailkit.com",
  termsLabel: "Terms",
  privacyLabel: "Privacy",
  guaranteeLabel: "Guarantee",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function wrapBrandedHtml({
  title,
  paragraphs,
  cta,
  footer = DEFAULT_FOOTER_EN,
  preheader,
}: {
  title: string;
  paragraphs: string[];
  cta?: EmailCta;
  footer?: EmailFooterStrings;
  preheader?: string;
}): string {
  const escapedTitle = escapeHtml(title);
  const escapedPreheader = preheader ? escapeHtml(preheader) : "";

  const paragraphHtml = paragraphs
    .map(
      (p) =>
        `      <p class="mk-p" style="font-size:16px;line-height:1.6;color:#52525B;margin:0 0 16px;">${escapeHtml(
          p,
        )}</p>`,
    )
    .join("\n");

  const ctaHtml = cta
    ? `      <p class="mk-p" style="margin:24px 0;">
        <a href="${escapeHtml(cta.url)}" class="mk-cta" style="display:inline-block;background:#7C5CFF;color:#FFFFFF;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:500;font-size:15px;">${escapeHtml(
          cta.text,
        )}</a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapedTitle}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      body { background: #0A0A0B !important; }
      .mk-card { background: #131314 !important; }
      .mk-h1 { color: #FAFAFA !important; }
      .mk-p { color: #A1A1AA !important; }
      .mk-cta { background: #7C5CFF !important; color: #FFFFFF !important; }
      .mk-footer-text { color: #71717A !important; }
      .mk-footer-link { color: #71717A !important; }
      .mk-divider { border-top-color: #2A2A2F !important; }
    }
  </style>
</head>
<body style="margin:0;padding:32px 16px;background:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  ${
    escapedPreheader
      ? `<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;">${escapedPreheader}</span>`
      : ""
  }
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
    <tr>
      <td align="center">
        <table role="presentation" class="mk-card" width="560" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:12px;padding:40px;">
          <tr>
            <td style="padding-bottom:32px;">
              <img src="${SITE_URL}/brand/mailkit-logo-full.png" alt="Mailkit" width="160" height="auto" style="display:block;border:0;outline:none;text-decoration:none;width:160px;height:auto;">
            </td>
          </tr>
          <tr>
            <td>
              <h1 class="mk-h1" style="font-size:24px;font-weight:600;color:#0A0A0B;margin:0 0 16px;line-height:1.3;">${escapedTitle}</h1>
${paragraphHtml}
${ctaHtml}
            </td>
          </tr>
          <tr>
            <td class="mk-divider" style="margin-top:40px;padding-top:24px;border-top:1px solid #E4E4E7;">
              <p class="mk-footer-text" style="font-size:13px;line-height:1.6;color:#71717A;margin:24px 0 12px;">${escapeHtml(
                footer.questions,
              )}</p>
              <p class="mk-footer-text" style="font-size:13px;line-height:1.6;color:#71717A;margin:0;">
                <a href="${SITE_URL}/terms" class="mk-footer-link" style="color:#71717A;text-decoration:underline;">${escapeHtml(
                  footer.termsLabel,
                )}</a> ·
                <a href="${SITE_URL}/privacy" class="mk-footer-link" style="color:#71717A;text-decoration:underline;">${escapeHtml(
                  footer.privacyLabel,
                )}</a> ·
                <a href="${SITE_URL}/guarantee" class="mk-footer-link" style="color:#71717A;text-decoration:underline;">${escapeHtml(
                  footer.guaranteeLabel,
                )}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Convenience helper for the common case: take a plain-text email
 * body (newline-separated paragraphs) and produce both `textContent`
 * and `htmlContent` so callers send the same message in both formats.
 */
export function brandedEmailContent({
  title,
  textContent,
  cta,
  footer,
  preheader,
}: {
  title: string;
  textContent: string;
  cta?: EmailCta;
  footer?: EmailFooterStrings;
  preheader?: string;
}): { textContent: string; htmlContent: string } {
  const paragraphs = textContent
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  return {
    textContent,
    htmlContent: wrapBrandedHtml({
      title,
      paragraphs,
      cta,
      footer,
      preheader,
    }),
  };
}
