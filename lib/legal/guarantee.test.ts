import { describe, expect, test } from "vitest";

import { GUARANTEE_EN, GUARANTEE_RU } from "./guarantee";

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
    expect(GUARANTEE_EN).toMatch(/Cloudflare, Brevo,\s*Google/);
  });

  test("EN: 24h auto-refund + 30-day functional + 3-10 business days processing", () => {
    expect(GUARANTEE_EN).toContain("24 hours");
    expect(GUARANTEE_EN).toContain("30 days");
    expect(GUARANTEE_EN).toContain("3-10 business days");
  });

  test("EN: support email", () => {
    expect(GUARANTEE_EN).toContain("support@getmailkit.com");
  });

  test("RU: heading + two numbered clauses", () => {
    expect(GUARANTEE_RU).toContain("Гарантия MailKit");
    expect(GUARANTEE_RU).toMatch(
      /\n1\. Автоматический возврат при сбое автоматики/,
    );
    expect(GUARANTEE_RU).toMatch(/\n2\. 30-дневная функциональная гарантия/);
  });

  test("RU: same time numbers as EN", () => {
    expect(GUARANTEE_RU).toContain("24 часов");
    expect(GUARANTEE_RU).toContain("30 дней");
    expect(GUARANTEE_RU).toContain("3-10 рабочих дней");
  });

  test("RU: support email same as EN", () => {
    expect(GUARANTEE_RU).toContain("support@getmailkit.com");
  });

  test("EN and RU are distinct strings (not aliased)", () => {
    expect(GUARANTEE_EN).not.toBe(GUARANTEE_RU);
  });
});
