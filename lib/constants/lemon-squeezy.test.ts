import { describe, expect, test } from "vitest";

import {
  FIRST_100_DISCOUNT_CODE,
  LEMON_SQUEEZY_CHECKOUT_URL,
  withFirst100Discount,
} from "./lemon-squeezy";

describe("LEMON_SQUEEZY_CHECKOUT_URL", () => {
  test("targets the velabot store /checkout/buy/<uuid> path", () => {
    expect(LEMON_SQUEEZY_CHECKOUT_URL).toMatch(
      /^https:\/\/velabot\.lemonsqueezy\.com\/checkout\/buy\/[0-9a-f-]+$/,
    );
  });
});

describe("FIRST_100_DISCOUNT_CODE", () => {
  test("is 'FIRST25' (the code Boris will create in LS dashboard)", () => {
    expect(FIRST_100_DISCOUNT_CODE).toBe("FIRST25");
  });
});

describe("withFirst100Discount", () => {
  test("appends checkout[discount_code]=FIRST25 to a clean URL", () => {
    const out = withFirst100Discount(LEMON_SQUEEZY_CHECKOUT_URL);
    const parsed = new URL(out);
    expect(parsed.searchParams.get("checkout[discount_code]")).toBe("FIRST25");
  });

  test("preserves existing query params", () => {
    const out = withFirst100Discount(
      "https://velabot.lemonsqueezy.com/checkout/buy/abc?aff=boris",
    );
    const parsed = new URL(out);
    expect(parsed.searchParams.get("aff")).toBe("boris");
    expect(parsed.searchParams.get("checkout[discount_code]")).toBe("FIRST25");
  });

  test("idempotent — second call leaves an already-coded URL unchanged", () => {
    const first = withFirst100Discount(LEMON_SQUEEZY_CHECKOUT_URL);
    const second = withFirst100Discount(first);
    expect(second).toBe(first);
  });

  test("does NOT overwrite a different existing discount code", () => {
    const out = withFirst100Discount(
      "https://velabot.lemonsqueezy.com/checkout/buy/abc?checkout%5Bdiscount_code%5D=LAUNCH50",
    );
    const parsed = new URL(out);
    expect(parsed.searchParams.get("checkout[discount_code]")).toBe("LAUNCH50");
  });

  test("malformed URL returns unchanged, no throw", () => {
    expect(withFirst100Discount("not a url")).toBe("not a url");
  });
});
