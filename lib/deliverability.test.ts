import { describe, expect, test } from "vitest";

import {
  DEFAULT_DELIVERABILITY_THRESHOLDS,
  evaluateDeliverability,
  formatRateForStorage,
} from "./deliverability";

const baseReport = {
  requests: 1000,
  hardBounces: 0,
  softBounces: 0,
  spamReports: 0,
  unsubscribed: 0,
};

describe("evaluateDeliverability", () => {
  test("under all thresholds → action=null", () => {
    const out = evaluateDeliverability({
      ...baseReport,
      hardBounces: 30, // 3% (under 5%)
      spamReports: 0,
      unsubscribed: 10, // 1% (under 2%)
    });
    expect(out.action).toBeNull();
    expect(out.reason).toBeNull();
    expect(out.rates.bounce).toBe(3);
    expect(out.rates.unsubscribe).toBe(1);
  });

  test("complaint over 0.1% → suspended (most severe wins)", () => {
    const out = evaluateDeliverability({
      ...baseReport,
      spamReports: 2, // 0.2% > 0.1%
      hardBounces: 100, // 10% > 5% (would also trigger bounce)
    });
    expect(out.action).toBe("suspended");
    expect(out.reason).toBe("complaint_threshold");
  });

  test("bounce over 5%, complaint OK → suspended (bounce reason)", () => {
    const out = evaluateDeliverability({
      ...baseReport,
      hardBounces: 51, // 5.1% > 5%
      softBounces: 0,
      spamReports: 0,
    });
    expect(out.action).toBe("suspended");
    expect(out.reason).toBe("bounce_threshold");
  });

  test("hard + soft bounces summed for bounce rate", () => {
    const out = evaluateDeliverability({
      ...baseReport,
      hardBounces: 30,
      softBounces: 25, // 30 + 25 = 55, 5.5% > 5%
    });
    expect(out.action).toBe("suspended");
    expect(out.reason).toBe("bounce_threshold");
    expect(out.rates.bounce).toBe(5.5);
  });

  test("only unsubscribe over 2% → warned (not suspended)", () => {
    const out = evaluateDeliverability({
      ...baseReport,
      unsubscribed: 25, // 2.5% > 2%
    });
    expect(out.action).toBe("warned");
    expect(out.reason).toBe("unsubscribe_threshold");
  });

  test("requests=0 → action=null, all rates=0", () => {
    const out = evaluateDeliverability({
      ...baseReport,
      requests: 0,
      hardBounces: 5,
      spamReports: 5,
      unsubscribed: 5,
    });
    expect(out.action).toBeNull();
    expect(out.rates.bounce).toBe(0);
    expect(out.rates.complaint).toBe(0);
    expect(out.rates.unsubscribe).toBe(0);
  });

  test("equal-to-threshold is NOT over (strict >)", () => {
    // 0.1% complaint exactly
    const out = evaluateDeliverability({
      ...baseReport,
      spamReports: 1, // 1/1000 = 0.1%
    });
    expect(out.action).toBeNull();
    expect(out.rates.complaint).toBeCloseTo(0.1, 5);
  });

  test("custom thresholds override defaults", () => {
    const out = evaluateDeliverability(
      { ...baseReport, spamReports: 1 }, // 0.1%
      { bounce: 5, complaint: 0.05, unsubscribe: 2 },
    );
    expect(out.action).toBe("suspended");
    expect(out.reason).toBe("complaint_threshold");
    expect(out.thresholds.complaint).toBe(0.05);
  });

  test("counts pass through report fields verbatim", () => {
    const out = evaluateDeliverability({
      requests: 500,
      hardBounces: 10,
      softBounces: 5,
      spamReports: 2,
      unsubscribed: 3,
    });
    expect(out.counts).toEqual({
      requests: 500,
      bounced: 15,
      complained: 2,
      unsubscribed: 3,
    });
  });

  test("default thresholds match spec (5 / 0.1 / 2)", () => {
    expect(DEFAULT_DELIVERABILITY_THRESHOLDS).toEqual({
      bounce: 5,
      complaint: 0.1,
      unsubscribe: 2,
    });
  });

  test("missing fields on report → coerced to 0", () => {
    const out = evaluateDeliverability({
      requests: 100,
      hardBounces: 0,
      softBounces: 0,
      // spamReports omitted
      // unsubscribed omitted
    } as Parameters<typeof evaluateDeliverability>[0]);
    expect(out.action).toBeNull();
    expect(out.counts.complained).toBe(0);
    expect(out.counts.unsubscribed).toBe(0);
  });
});

describe("formatRateForStorage", () => {
  test("rounds to 3 decimals (preserves complaint sub-percent precision)", () => {
    expect(formatRateForStorage(0.1234)).toBe(0.123);
    expect(formatRateForStorage(5.6789)).toBe(5.679);
    expect(formatRateForStorage(0)).toBe(0);
  });

  test("non-finite + negative → 0", () => {
    expect(formatRateForStorage(NaN)).toBe(0);
    expect(formatRateForStorage(Infinity)).toBe(0);
    expect(formatRateForStorage(-1)).toBe(0);
  });
});
