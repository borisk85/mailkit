import { describe, expect, test } from "vitest";

import {
  DELIVERABILITY_DISCLAIMER_EN,
  DELIVERABILITY_DISCLAIMER_RU,
  disclaimerForLocale,
} from "./disclaimer";

/**
 * Smoke checks on the canonical disclaimer text. These guard the
 * load-bearing phrases the architect spec calls for verbatim — if a
 * future docs sync drops one of them, CI fails before prod ships
 * out-of-policy copy to /faq, /terms, or the welcome email.
 */
describe("Deliverability disclaimer canonical text", () => {
  test("EN full form names the four authentication standards", () => {
    expect(DELIVERABILITY_DISCLAIMER_EN.full).toContain(
      "SPF/DKIM/DMARC authentication",
    );
  });

  test("EN full form attributes responsibility to sender, not MailKit", () => {
    expect(DELIVERABILITY_DISCLAIMER_EN.full).toContain(
      "outside our control and outside our responsibility",
    );
    expect(DELIVERABILITY_DISCLAIMER_EN.full).toContain("sender's job");
  });

  test("EN warmup tip names a concrete first-week limit", () => {
    expect(DELIVERABILITY_DISCLAIMER_EN.warmupTip).toMatch(
      /10.20 emails per day/,
    );
    expect(DELIVERABILITY_DISCLAIMER_EN.warmupTip).toContain("first week");
  });

  test("RU full form mirrors the EN structure (warmup + list hygiene + consent)", () => {
    expect(DELIVERABILITY_DISCLAIMER_RU.full).toContain(
      "SPF/DKIM/DMARC аутентификацию",
    );
    expect(DELIVERABILITY_DISCLAIMER_RU.full).toContain("вне нашего контроля");
    expect(DELIVERABILITY_DISCLAIMER_RU.full).toContain("задача отправителя");
  });

  test("RU warmup tip names the same first-week limit as EN", () => {
    expect(DELIVERABILITY_DISCLAIMER_RU.warmupTip).toMatch(
      /10.20 писем в день/,
    );
    expect(DELIVERABILITY_DISCLAIMER_RU.warmupTip).toContain("первую неделю");
  });

  test("disclaimerForLocale picks RU only on exact 'ru' (EN is the default)", () => {
    expect(disclaimerForLocale("ru")).toBe(DELIVERABILITY_DISCLAIMER_RU);
    expect(disclaimerForLocale("en")).toBe(DELIVERABILITY_DISCLAIMER_EN);
    // Unknown locale falls back to EN — matches our routing default.
    expect(disclaimerForLocale("de")).toBe(DELIVERABILITY_DISCLAIMER_EN);
    expect(disclaimerForLocale("")).toBe(DELIVERABILITY_DISCLAIMER_EN);
  });

  test("attributionOnly variant ends with sender's-responsibility framing", () => {
    expect(DELIVERABILITY_DISCLAIMER_EN.attributionOnly).toContain(
      "sender's job",
    );
    expect(DELIVERABILITY_DISCLAIMER_RU.attributionOnly).toContain(
      "задача отправителя",
    );
  });

  test("the three variants are distinct strings (no accidental aliasing)", () => {
    expect(DELIVERABILITY_DISCLAIMER_EN.full).not.toBe(
      DELIVERABILITY_DISCLAIMER_EN.attributionOnly,
    );
    expect(DELIVERABILITY_DISCLAIMER_EN.full).not.toBe(
      DELIVERABILITY_DISCLAIMER_EN.warmupTip,
    );
    expect(DELIVERABILITY_DISCLAIMER_EN.attributionOnly).not.toBe(
      DELIVERABILITY_DISCLAIMER_EN.warmupTip,
    );
  });
});
