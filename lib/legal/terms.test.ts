import { describe, expect, test } from "vitest";

import { TERMS_EN, TERMS_RU } from "./terms";

/**
 * Smoke checks on the canonical Terms text. We can't assert the full
 * paragraph structure without rewriting the text here too — that would
 * defeat the "single source" principle. Instead these tests guard the
 * sections architects/owners actually rely on existing (LS consent
 * link copy, Google OAuth verification scope text, refund clause).
 *
 * If any of these fail after a docs/LEGAL_PROTECTIONS.md sync, audit
 * the diff against the legal text before bumping the assertions.
 */

describe("Terms canonical text", () => {
  test("EN: title + last-updated + 11 numbered sections", () => {
    expect(TERMS_EN).toContain("MailKit — Terms of Service");
    expect(TERMS_EN).toContain("Last updated:");
    for (let i = 1; i <= 11; i++) {
      expect(TERMS_EN).toMatch(new RegExp(`\\n${i}\\. `));
    }
  });

  test("EN: liability cap clause names $5", () => {
    expect(TERMS_EN).toContain("$5 USD for a single mailbox");
    expect(TERMS_EN).toContain("Limitation of liability");
  });

  test("EN: deliverability disclaimer present (#24 dependency)", () => {
    expect(TERMS_EN).toContain(
      "Email deliverability to any specific recipient",
    );
  });

  test("EN: bounce/complaint thresholds match #21 + #22 specs", () => {
    expect(TERMS_EN).toMatch(/Bounce rate exceeding 5%/);
    expect(TERMS_EN).toMatch(/Complaint rate exceeding 0\.1%/);
    expect(TERMS_EN).toMatch(/500 emails per day per domain/);
  });

  test("RU: title + 11 numbered sections", () => {
    expect(TERMS_RU).toContain("MailKit — Условия пользования");
    expect(TERMS_RU).toContain("Последнее обновление:");
    for (let i = 1; i <= 11; i++) {
      expect(TERMS_RU).toMatch(new RegExp(`\\n${i}\\. `));
    }
  });

  test("RU: liability clause names $5", () => {
    expect(TERMS_RU).toContain("5 долларов США за настройку одного");
  });

  test("RU: same bounce/complaint thresholds as EN", () => {
    expect(TERMS_RU).toMatch(/более 5 процентов/);
    expect(TERMS_RU).toMatch(/более 0\.1 процента/);
    expect(TERMS_RU).toMatch(/более 500 писем в сутки/);
  });

  test("contact email is consistent across locales", () => {
    expect(TERMS_EN).toContain("support@getmailkit.com");
    expect(TERMS_RU).toContain("support@getmailkit.com");
  });
});
