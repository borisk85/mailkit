import { describe, expect, test } from "vitest";

import { checkPhishingPattern } from "./phishing";

describe("checkPhishingPattern", () => {
  describe("reserved mailbox names", () => {
    test("noreply → flagged", () => {
      const result = checkPhishingPattern("noreply", "domain.com");
      expect(result.flagged).toBe(true);
    });

    test("admin → flagged", () => {
      const result = checkPhishingPattern("admin", "legit.com");
      expect(result.flagged).toBe(true);
    });

    test("info → flagged", () => {
      const result = checkPhishingPattern("info", "paypa1.com");
      // Flagged due to reserved name (checked before typosquatting)
      expect(result.flagged).toBe(true);
    });

    test("contact → flagged (reserved name)", () => {
      // "contact" is in SUSPICIOUS_NAMES — flagged regardless of domain
      const result = checkPhishingPattern("contact", "cloudflare.com");
      expect(result.flagged).toBe(true);
    });

    test("hello → not flagged (not reserved)", () => {
      const result = checkPhishingPattern("hello", "mysite.com");
      expect(result.flagged).toBe(false);
    });
  });

  describe("typosquatting detection", () => {
    test("gooogle.com → flagged (1 edit from google)", () => {
      const result = checkPhishingPattern("hello", "gooogle.com");
      expect(result.flagged).toBe(true);
      if (result.flagged) {
        expect(result.reason).toContain("google");
      }
    });

    test("paypa1.com → flagged (1 edit from paypal)", () => {
      // "info" would be caught as reserved first, use a neutral local
      const result = checkPhishingPattern("billing2", "paypa1.com");
      expect(result.flagged).toBe(true);
      if (result.flagged) {
        expect(result.reason).toContain("paypal");
      }
    });

    test("mysite.com → not flagged", () => {
      const result = checkPhishingPattern("hello", "mysite.com");
      expect(result.flagged).toBe(false);
    });

    test("cloudflare.com → not flagged (exact brand match, distance = 0)", () => {
      // Levenshtein distance to "cloudflare" is 0 — condition is distance ≤ 1 AND domainSld !== brand
      // so exact match is excluded
      const result = checkPhishingPattern("hello", "cloudflare.com");
      expect(result.flagged).toBe(false);
    });

    test("cloudf1are.com → flagged (1 edit from cloudflare)", () => {
      const result = checkPhishingPattern("hello", "cloudf1are.com");
      expect(result.flagged).toBe(true);
    });
  });

  describe("reason string content", () => {
    test("reserved name reason mentions the mailbox name", () => {
      const result = checkPhishingPattern("noreply", "domain.com");
      if (result.flagged) {
        expect(result.reason).toContain("noreply");
      }
    });

    test("typosquatting reason mentions the domain", () => {
      const result = checkPhishingPattern("hello", "gooogle.com");
      if (result.flagged) {
        expect(result.reason).toContain("gooogle.com");
      }
    });
  });
});
