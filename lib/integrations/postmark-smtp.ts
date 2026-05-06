import "server-only";

import type { SmtpDisplay } from "@/lib/integrations/brevo-smtp";

export { SmtpDisplay };

export class PostmarkSmtpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostmarkSmtpConfigError";
  }
}

/**
 * Build per-customer SMTP display from the customer's Postmark Server API token.
 * Unlike Brevo (shared account credentials), every Postmark Server has its own
 * token which doubles as both SMTP username and password.
 */
export function buildPostmarkSmtpDisplay(serverToken: string): SmtpDisplay {
  if (!serverToken) {
    throw new PostmarkSmtpConfigError("postmark_server_token_missing");
  }
  return {
    host: "smtp.postmarkapp.com",
    port: 587,
    username: serverToken,
    password: serverToken,
    securityMode: "starttls",
    keyVersion: 1,
  };
}
