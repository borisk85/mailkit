import { describe, expect, test } from "vitest";

import {
  DEFAULT_SEND_LIMITS,
  currentWindowBuckets,
  evaluateSendLimits,
  periodLabel,
  type SendCounterRow,
} from "./send-limits";

const NOW = new Date("2026-04-26T17:42:31Z");

describe("currentWindowBuckets", () => {
  test("floors to UTC day / hour / minute", () => {
    expect(currentWindowBuckets(NOW)).toEqual({
      day: "2026-04-26T00:00:00.000Z",
      hour: "2026-04-26T17:00:00.000Z",
      minute: "2026-04-26T17:42:00.000Z",
    });
  });

  test("midnight UTC: all three buckets share the same instant", () => {
    const midnight = new Date("2026-04-26T00:00:00Z");
    const b = currentWindowBuckets(midnight);
    expect(b.day).toBe("2026-04-26T00:00:00.000Z");
    expect(b.hour).toBe("2026-04-26T00:00:00.000Z");
    expect(b.minute).toBe("2026-04-26T00:00:00.000Z");
  });
});

describe("evaluateSendLimits", () => {
  const counter = (overrides: Partial<SendCounterRow>): SendCounterRow => ({
    domain: "ex.com",
    window_type: "day",
    window_start: "2026-04-26T00:00:00.000Z",
    count: 0,
    ...overrides,
  });

  test("empty counters → not over limit", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [],
      now: NOW,
    });
    expect(out.overLimit).toBe(false);
    expect(out.exceeded).toEqual([]);
    expect(out.windows.day.count).toBe(0);
    expect(out.windows.day.limit).toBe(DEFAULT_SEND_LIMITS.day);
  });

  test("under all thresholds → not over limit", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [
        counter({ window_type: "day", count: 100 }),
        counter({
          window_type: "hour",
          window_start: "2026-04-26T17:00:00.000Z",
          count: 10,
        }),
        counter({
          window_type: "minute",
          window_start: "2026-04-26T17:42:00.000Z",
          count: 1,
        }),
      ],
      now: NOW,
    });
    expect(out.overLimit).toBe(false);
    expect(out.windows.day.count).toBe(100);
    expect(out.windows.hour.count).toBe(10);
    expect(out.windows.minute.count).toBe(1);
  });

  test("over day only → exceeded=[day]", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [counter({ window_type: "day", count: 501 })],
      now: NOW,
    });
    expect(out.overLimit).toBe(true);
    expect(out.exceeded).toEqual(["day"]);
  });

  test("over hour only → exceeded=[hour]", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [
        counter({
          window_type: "hour",
          window_start: "2026-04-26T17:00:00.000Z",
          count: 51,
        }),
      ],
      now: NOW,
    });
    expect(out.overLimit).toBe(true);
    expect(out.exceeded).toEqual(["hour"]);
  });

  test("over minute only → exceeded=[minute]", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [
        counter({
          window_type: "minute",
          window_start: "2026-04-26T17:42:00.000Z",
          count: 6,
        }),
      ],
      now: NOW,
    });
    expect(out.overLimit).toBe(true);
    expect(out.exceeded).toEqual(["minute"]);
  });

  test("over multiple windows → exceeded ordered day,hour,minute", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [
        counter({ window_type: "day", count: 600 }),
        counter({
          window_type: "minute",
          window_start: "2026-04-26T17:42:00.000Z",
          count: 100,
        }),
      ],
      now: NOW,
    });
    expect(out.overLimit).toBe(true);
    // Source order is implementation-defined, but day must come before
    // minute because the loop walks day → hour → minute.
    expect(out.exceeded).toEqual(["day", "minute"]);
  });

  test("counters for other domain are ignored", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [
        counter({ domain: "other.com", window_type: "day", count: 9999 }),
      ],
      now: NOW,
    });
    expect(out.overLimit).toBe(false);
    expect(out.windows.day.count).toBe(0);
  });

  test("stale window_start (previous hour) is ignored", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [
        counter({
          window_type: "hour",
          window_start: "2026-04-26T16:00:00.000Z", // previous hour
          count: 9999,
        }),
      ],
      now: NOW,
    });
    expect(out.overLimit).toBe(false);
    expect(out.windows.hour.count).toBe(0);
  });

  test("custom thresholds override defaults", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [counter({ window_type: "day", count: 200 })],
      now: NOW,
      thresholds: { day: 100, hour: 50, minute: 5 },
    });
    expect(out.overLimit).toBe(true);
    expect(out.exceeded).toEqual(["day"]);
    expect(out.windows.day.limit).toBe(100);
  });

  test("equal-to-limit is NOT over (strict greater-than semantics)", () => {
    const out = evaluateSendLimits({
      domain: "ex.com",
      counters: [counter({ window_type: "day", count: 500 })],
      now: NOW,
    });
    expect(out.overLimit).toBe(false);
    expect(out.exceeded).toEqual([]);
  });
});

describe("periodLabel", () => {
  test("EN labels", () => {
    expect(periodLabel("day")).toBe("day");
    expect(periodLabel("hour")).toBe("hour");
    expect(periodLabel("minute")).toBe("minute");
  });
});
