import "server-only";

export type SmtpDisplay = {
  host: string;
  port: number;
  username: string;
  password: string;
  securityMode: "starttls" | "ssl";
  keyVersion: number;
};

export class PostmarkSmtpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostmarkSmtpConfigError";
  }
}

/**
 * Build per-customer SMTP display from the customer's Postmark Server API token.
 * Unlike Postmark (shared account credentials), every Postmark Server has its own
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
