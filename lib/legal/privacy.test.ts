import { describe, expect, test } from "vitest";

import { PRIVACY_EN } from "./privacy";

/**
 * Smoke checks on the canonical Privacy Policy text. Section 11 has
 * exact-string assertions because Google reviewers fuzzy-match those
 * phrases during OAuth verification — drift here = rejection risk.
 */

describe("Privacy canonical text", () => {
  test("EN: title + last-updated + 11 numbered sections", () => {
    expect(PRIVACY_EN).toContain("MailKit — Privacy Policy");
    expect(PRIVACY_EN).toContain("Last updated:");
    for (let i = 1; i <= 11; i++) {
      expect(PRIVACY_EN).toMatch(new RegExp(`\\n${i}\\. `));
    }
  });

  test("EN: section 11 Limited Use clauses verbatim (Google verification gate)", () => {
    // These three sentences are the verbatim Google-prescribed wording.
    // Reviewers fuzzy-match them; any rewording risks rejection.
    expect(PRIVACY_EN).toContain(
      "MailKit's use of information received from Google APIs adheres to\nthe Google API Services User Data Policy, including the Limited\nUse requirements.",
    );
    expect(PRIVACY_EN).toContain(
      "We do not transfer Google user data to others except as\n  necessary to provide or improve user-facing features that are\n  prominent in the Service.",
    );
    expect(PRIVACY_EN).toContain(
      "We do not use or transfer Google user data for serving\n  advertisements, including retargeting.",
    );
    expect(PRIVACY_EN).toContain(
      "We do not allow humans to read Google user data unless required\n  for security purposes, to comply with applicable law, or with\n  your explicit consent.",
    );
  });

  test("EN: third-party providers list includes the seven we use", () => {
    for (const provider of [
      "Google",
      "Cloudflare",
      "Postmark",
      "Lemon Squeezy",
      "Supabase",
      "Vercel",
      "Amazon Web Services",
    ]) {
      expect(PRIVACY_EN).toContain(provider);
    }
  });

  test("EN: data retention windows match docs/PRIVACY_POLICY.md spec", () => {
    expect(PRIVACY_EN).toMatch(
      /Setup configuration logs: retained for 90 days/,
    );
    expect(PRIVACY_EN).toMatch(/Server logs: 30 days/);
    expect(PRIVACY_EN).toMatch(/Payment records: retained for 5 years/);
  });

  test("EN: support contact email present", () => {
    expect(PRIVACY_EN).toContain("support@getmailkit.com");
  });
});
