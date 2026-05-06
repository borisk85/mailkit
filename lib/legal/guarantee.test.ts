import { describe, expect, test } from "vitest";

import { GUARANTEE_EN } from "./guarantee";

/**
 * Smoke checks on the canonical guarantee text. The two clauses
 * (Automation Failure + 30-Day Functional) are load-bearing — Hero,
 * llms.txt, and JSON-LD descriptions all reference them by name —
 * so any future docs/GUARANTEE_POLICY.md sync that drops one fails
 * CI before it reaches prod.
 */

describe("Guarantee canonical text", () => {
  test("EN: heading + two numbered clauses", () => {
    expect(GUARANTEE_EN).toContain("MailKit Guarantee");
    expect(GUARANTEE_EN).toMatch(/\n1\. Automation Failure Refund/);
    expect(GUARANTEE_EN).toMatch(/\n2\. 30-Day Functional Guarantee/);
  });

  test("EN: 'What is not covered' carve-outs include Gmail step + DNS edits + deliverability + third-party suspension", () => {
    expect(GUARANTEE_EN).toContain("What is not covered");
    expect(GUARANTEE_EN).toContain("Gmail Send-As");
    expect(GUARANTEE_EN).toContain("DNS records");
    expect(GUARANTEE_EN).toContain("deliverability");
    expect(GUARANTEE_EN).toMatch(/Cloudflare, Postmark,\s*Google/);
  });

  test("EN: 24h auto-refund + 30-day functional + 3-10 business days processing", () => {
    expect(GUARANTEE_EN).toContain("24 hours");
    expect(GUARANTEE_EN).toContain("30 days");
    expect(GUARANTEE_EN).toContain("3-10 business days");
  });

  test("EN: support email", () => {
    expect(GUARANTEE_EN).toContain("support@getmailkit.com");
  });
});
