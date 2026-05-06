import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  faqPageSchema,
  landingGraph,
  organizationSchema,
  productSchema,
  softwareApplicationSchema,
  type FaqItem,
} from "./structured-data";

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = "https://getmailkit.com";
});

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  }
});

describe("organizationSchema", () => {
  test("brand identity, contact point with EN support", () => {
    const s = organizationSchema();
    expect(s["@type"]).toBe("Organization");
    expect(s["@id"]).toBe("https://getmailkit.com/#organization");
    expect(s.name).toBe("MailKit");
    expect(s.logo).toBe("https://getmailkit.com/brand/mailkit-logo-full.png");
    const contact = s.contactPoint as Record<string, unknown>;
    expect(contact.email).toBe("support@getmailkit.com");
    expect(contact.availableLanguage).toEqual(["English"]);
  });

  test("falls back to getmailkit.com when NEXT_PUBLIC_SITE_URL unset", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(organizationSchema()["@id"]).toBe(
      "https://getmailkit.com/#organization",
    );
  });

  test("uses NEXT_PUBLIC_SITE_URL override (preview alias)", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.com";
    expect(organizationSchema()["@id"]).toBe(
      "https://preview.example.com/#organization",
    );
  });
});

describe("softwareApplicationSchema", () => {
  test("BusinessApplication + Web + USD 5.00 offer", () => {
    const s = softwareApplicationSchema();
    expect(s["@type"]).toBe("SoftwareApplication");
    expect(s.applicationCategory).toBe("BusinessApplication");
    expect(s.operatingSystem).toBe("Web");
    expect(s.inLanguage).toBe("en");
    const offer = s.offers as Record<string, unknown>;
    expect(offer["@type"]).toBe("Offer");
    expect(offer.price).toBe("5.00");
    expect(offer.priceCurrency).toBe("USD");
    expect(offer.availability).toBe("https://schema.org/InStock");
    expect(s.description).toContain("5 minutes");
    expect(s.description).toContain("$5 one-time");
    expect(s.description).toContain("Cloudflare");
    expect(s.description).toContain("Postmark");
    expect(s.description).toContain("Gmail Send-As");
  });

  test("publisher cross-references the Organization @id", () => {
    const s = softwareApplicationSchema();
    expect(s.publisher).toEqual({
      "@id": "https://getmailkit.com/#organization",
    });
  });
});

describe("productSchema", () => {
  test("Product + Offer with name + offer URL", () => {
    const s = productSchema();
    expect(s["@type"]).toBe("Product");
    expect(s.name).toContain("MailKit");
    const offer = s.offers as Record<string, unknown>;
    expect(offer.url).toBe("https://getmailkit.com/#pricing");
    expect(offer.price).toBe("5.00");
  });

  test("brand cross-references Organization @id", () => {
    expect(productSchema().brand).toEqual({
      "@id": "https://getmailkit.com/#organization",
    });
  });
});

describe("faqPageSchema", () => {
  const items: FaqItem[] = [
    {
      id: "cost",
      q: "How much does MailKit cost?",
      a: "MailKit costs $5 once per mailbox.",
    },
    {
      id: "duration",
      q: "How long does setup take?",
      a: "About 5 minutes end to end.",
    },
  ];

  test("each item becomes a Question with acceptedAnswer", () => {
    const s = faqPageSchema("en", items);
    expect(s["@type"]).toBe("FAQPage");
    expect(s.inLanguage).toBe("en");
    const main = s.mainEntity as Array<Record<string, unknown>>;
    expect(main).toHaveLength(2);
    expect(main[0]["@type"]).toBe("Question");
    expect(main[0].name).toBe("How much does MailKit cost?");
    expect(main[0]["@id"]).toBe("https://getmailkit.com/#faq-cost");
    const answer = main[0].acceptedAnswer as Record<string, unknown>;
    expect(answer["@type"]).toBe("Answer");
    expect(answer.text).toBe("MailKit costs $5 once per mailbox.");
  });

  test("empty items array yields empty mainEntity (legal but inert)", () => {
    const s = faqPageSchema("en", []);
    expect(s.mainEntity).toEqual([]);
  });
});

describe("landingGraph", () => {
  const items: FaqItem[] = [{ id: "cost", q: "How much?", a: "$5." }];

  test("@graph carries 4 schemas in a single document", () => {
    const g = landingGraph("en", items);
    expect(g["@context"]).toBe("https://schema.org");
    const graph = g["@graph"] as Array<Record<string, unknown>>;
    expect(graph).toHaveLength(4);
    const types = graph.map((n) => n["@type"]);
    expect(types).toEqual([
      "Organization",
      "SoftwareApplication",
      "Product",
      "FAQPage",
    ]);
  });

  test("FAQ items make it into the graph node verbatim", () => {
    const g = landingGraph("en", [{ id: "x", q: "Q-text", a: "A-text" }]);
    const graph = g["@graph"] as Array<Record<string, unknown>>;
    const faq = graph[3];
    const main = faq.mainEntity as Array<Record<string, unknown>>;
    expect(main[0].name).toBe("Q-text");
    const answer = main[0].acceptedAnswer as Record<string, unknown>;
    expect(answer.text).toBe("A-text");
  });
});
