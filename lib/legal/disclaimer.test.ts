import { describe, expect, test } from "vitest";

import { DELIVERABILITY_DISCLAIMER_EN } from "./disclaimer";

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

  test("attributionOnly variant ends with sender's-responsibility framing", () => {
    expect(DELIVERABILITY_DISCLAIMER_EN.attributionOnly).toContain(
      "sender's job",
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
