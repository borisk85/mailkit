import { describe, expect, it } from "vitest";

import { BrevoSmtpConfigError, loadSmtpDisplay } from "./brevo-smtp";

const validEnv = {
  BREVO_SMTP_HOST: "smtp-relay.brevo.com",
  BREVO_SMTP_PORT: "587",
  BREVO_SMTP_LOGIN: "owner@brevo.com",
  BREVO_SMTP_KEY: "xsmtpsib-0123456789abcdef",
  BREVO_SMTP_KEY_VERSION: "2",
} as const;

describe("loadSmtpDisplay", () => {
  it("returns display object from env with explicit version", () => {
    expect(loadSmtpDisplay({ ...validEnv })).toEqual({
      host: "smtp-relay.brevo.com",
      port: 587,
      username: "owner@brevo.com",
      password: "xsmtpsib-0123456789abcdef",
      securityMode: "starttls",
      keyVersion: 2,
    });
  });

  it("defaults keyVersion to 1 when env var is absent", () => {
    const rest = { ...validEnv } as Record<string, string | undefined>;
    delete rest.BREVO_SMTP_KEY_VERSION;
    expect(loadSmtpDisplay(rest).keyVersion).toBe(1);
  });

  it("switches securityMode to ssl on port 465", () => {
    expect(
      loadSmtpDisplay({ ...validEnv, BREVO_SMTP_PORT: "465" }).securityMode,
    ).toBe("ssl");
  });

  it("trims whitespace in every field", () => {
    const out = loadSmtpDisplay({
      BREVO_SMTP_HOST: "  smtp-relay.brevo.com  ",
      BREVO_SMTP_PORT: " 587 ",
      BREVO_SMTP_LOGIN: "  owner@brevo.com\t",
      BREVO_SMTP_KEY: "  xsmtpsib-abc  ",
      BREVO_SMTP_KEY_VERSION: " 3 ",
    });
    expect(out.host).toBe("smtp-relay.brevo.com");
    expect(out.username).toBe("owner@brevo.com");
    expect(out.password).toBe("xsmtpsib-abc");
    expect(out.keyVersion).toBe(3);
  });

  it.each([
    ["BREVO_SMTP_HOST", ""],
    ["BREVO_SMTP_PORT", ""],
    ["BREVO_SMTP_LOGIN", ""],
    ["BREVO_SMTP_KEY", ""],
  ])("throws brevo_smtp_env_missing when %s is blank", (key, blank) => {
    const env = { ...validEnv, [key]: blank };
    expect(() => loadSmtpDisplay(env)).toThrow(BrevoSmtpConfigError);
    expect(() => loadSmtpDisplay(env)).toThrow("brevo_smtp_env_missing");
  });

  it("rejects non-numeric port", () => {
    expect(() =>
      loadSmtpDisplay({ ...validEnv, BREVO_SMTP_PORT: "notanumber" }),
    ).toThrow("brevo_smtp_port_invalid");
  });

  it("rejects port outside 1..65535", () => {
    expect(() =>
      loadSmtpDisplay({ ...validEnv, BREVO_SMTP_PORT: "0" }),
    ).toThrow("brevo_smtp_port_invalid");
    expect(() =>
      loadSmtpDisplay({ ...validEnv, BREVO_SMTP_PORT: "70000" }),
    ).toThrow("brevo_smtp_port_invalid");
  });

  it("rejects invalid key version", () => {
    expect(() =>
      loadSmtpDisplay({ ...validEnv, BREVO_SMTP_KEY_VERSION: "0" }),
    ).toThrow("brevo_smtp_key_version_invalid");
    expect(() =>
      loadSmtpDisplay({ ...validEnv, BREVO_SMTP_KEY_VERSION: "-2" }),
    ).toThrow("brevo_smtp_key_version_invalid");
    expect(() =>
      loadSmtpDisplay({ ...validEnv, BREVO_SMTP_KEY_VERSION: "abc" }),
    ).toThrow("brevo_smtp_key_version_invalid");
  });
});
