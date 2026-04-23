import "server-only";

/**
 * Ticket #6 — Brevo SMTP credentials for the Gmail Send-As wizard.
 *
 * Brevo has no API to create or fetch SMTP keys; they are generated in
 * the Brevo dashboard (Settings → SMTP & API → SMTP) and shared at the
 * account level. Every customer's Gmail Send-As points at the same
 * host/port/login/key — the domain-level DKIM + brevo_code records
 * (written in Ticket #4b) gate which From-addresses the relay accepts.
 * See docs/SECURITY.md for the shared-surface rationale and abuse
 * mitigations, and docs/SPIKE_FINDINGS.md for the research trail.
 */

export type SmtpDisplay = {
  host: string;
  port: number;
  username: string;
  password: string;
  securityMode: "starttls" | "ssl";
  keyVersion: number;
};

export class BrevoSmtpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BrevoSmtpConfigError";
  }
}

type EnvLike = Record<string, string | undefined>;

export function loadSmtpDisplay(env: EnvLike = process.env): SmtpDisplay {
  const host = env.BREVO_SMTP_HOST?.trim();
  const portRaw = env.BREVO_SMTP_PORT?.trim();
  const username = env.BREVO_SMTP_LOGIN?.trim();
  const password = env.BREVO_SMTP_KEY?.trim();
  const versionRaw = env.BREVO_SMTP_KEY_VERSION?.trim();

  if (!host || !portRaw || !username || !password) {
    throw new BrevoSmtpConfigError("brevo_smtp_env_missing");
  }
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new BrevoSmtpConfigError("brevo_smtp_port_invalid");
  }
  const keyVersion = versionRaw ? Number(versionRaw) : 1;
  if (!Number.isInteger(keyVersion) || keyVersion < 1) {
    throw new BrevoSmtpConfigError("brevo_smtp_key_version_invalid");
  }
  const securityMode: SmtpDisplay["securityMode"] =
    port === 465 ? "ssl" : "starttls";
  return { host, port, username, password, securityMode, keyVersion };
}
