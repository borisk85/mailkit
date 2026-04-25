import { describe, expect, test } from "vitest";

import { shouldAutoRefund } from "./refund-policy";

describe("shouldAutoRefund", () => {
  test.each([
    ["enable_routing", true],
    ["dns_upsert", true],
    ["list_destinations", true],
    ["create_destination", true],
    ["list_rules", true],
    ["create_rule", true],
    ["brevo_create_sender", true],
    ["brevo_dns_upsert", true],
    ["brevo_spf_merge", true],
    ["brevo_verify", true],
    ["brevo_finalize", true],
  ])("step %s → auto-refund", (step, expected) => {
    expect(shouldAutoRefund(step)).toBe(expected);
  });

  test.each([
    ["start", false],
    ["list_zones", false],
    ["gmail_prepare", false],
    ["gmail_confirm", false],
    ["unknown_step", false],
  ])("step %s → manual path", (step, expected) => {
    expect(shouldAutoRefund(step)).toBe(expected);
  });

  test("null / undefined / empty → false (fail-closed)", () => {
    expect(shouldAutoRefund(null)).toBe(false);
    expect(shouldAutoRefund(undefined)).toBe(false);
    expect(shouldAutoRefund("")).toBe(false);
  });
});
