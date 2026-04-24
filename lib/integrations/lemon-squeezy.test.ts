import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import crypto from "node:crypto";

vi.mock("server-only", () => ({}));

import {
  LemonSqueezyError,
  createLemonSqueezyClient,
  hashWebhookBody,
  verifyWebhookSignature,
} from "./lemon-squeezy";

const BASE = "https://api.lemonsqueezy.com/v1";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function orderPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      type: "orders",
      id: "123",
      attributes: {
        identifier: "abc-123",
        status: "paid",
        user_email: "buyer@example.com",
        total: 500,
        currency: "USD",
        refunded_amount: 0,
        refunded: false,
        refunded_at: null,
        test_mode: true,
        ...overrides,
      },
    },
  };
}

describe("createLemonSqueezyClient", () => {
  test("throws on missing API key", () => {
    expect(() => createLemonSqueezyClient("")).toThrow(LemonSqueezyError);
    try {
      createLemonSqueezyClient("");
    } catch (e) {
      expect(e).toBeInstanceOf(LemonSqueezyError);
      expect((e as LemonSqueezyError).code).toBe("missing_api_key");
    }
  });

  test("getOrder returns normalized LsOrder", async () => {
    server.use(
      http.get(`${BASE}/orders/123`, ({ request }) => {
        expect(request.headers.get("Authorization")).toBe("Bearer k");
        expect(request.headers.get("Accept")).toBe("application/vnd.api+json");
        return HttpResponse.json(orderPayload());
      }),
    );
    const client = createLemonSqueezyClient("k");
    const order = await client.getOrder("123");
    expect(order).toEqual({
      id: "123",
      identifier: "abc-123",
      status: "paid",
      userEmail: "buyer@example.com",
      totalCents: 500,
      currency: "USD",
      refundedAmountCents: 0,
      refunded: false,
      refundedAt: null,
      testMode: true,
    });
  });

  test("getOrder surfaces 4xx as LemonSqueezyError with code + status", async () => {
    server.use(
      http.get(`${BASE}/orders/999`, () =>
        HttpResponse.json(
          {
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: "Order not found",
                code: "not_found",
              },
            ],
          },
          { status: 404 },
        ),
      ),
    );
    const client = createLemonSqueezyClient("k");
    await expect(client.getOrder("999")).rejects.toMatchObject({
      name: "LemonSqueezyError",
      code: "not_found",
      httpStatus: 404,
    });
  });

  test("createRefund omits amount → full refund body data.attributes is empty", async () => {
    const seenBodies: unknown[] = [];
    server.use(
      http.post(`${BASE}/orders/123/refund`, async ({ request }) => {
        const body = await request.json();
        seenBodies.push(body);
        return HttpResponse.json(
          orderPayload({
            status: "refunded",
            refunded: true,
            refunded_at: "2026-04-24T10:00:00Z",
            refunded_amount: 500,
          }),
        );
      }),
    );
    const client = createLemonSqueezyClient("k");
    const out = await client.createRefund("123");
    expect(out.refunded).toBe(true);
    expect(out.refundedAmountCents).toBe(500);
    expect(seenBodies).toEqual([
      {
        data: { type: "orders", id: "123", attributes: {} },
      },
    ]);
  });

  test("createRefund with amountCents sends that amount in body", async () => {
    let seen: unknown = null;
    server.use(
      http.post(`${BASE}/orders/123/refund`, async ({ request }) => {
        seen = await request.json();
        return HttpResponse.json(orderPayload({ refunded_amount: 250 }));
      }),
    );
    const client = createLemonSqueezyClient("k");
    await client.createRefund("123", 250);
    expect(seen).toEqual({
      data: { type: "orders", id: "123", attributes: { amount: 250 } },
    });
  });

  test("5xx retries up to 3 times, then bubbles last error", async () => {
    let attempts = 0;
    server.use(
      http.get(`${BASE}/orders/1`, () => {
        attempts += 1;
        return HttpResponse.json(
          { errors: [{ title: "Oops", code: "server_error" }] },
          { status: 500 },
        );
      }),
    );
    const client = createLemonSqueezyClient("k");
    // Skip real 1s/2s/4s delays — setTimeout is swallowed in tests so
    // the retries run back-to-back and the test finishes well under
    // the default 5s timeout.
    const timeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation(((
      cb: () => void,
    ) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    await expect(client.getOrder("1")).rejects.toMatchObject({
      name: "LemonSqueezyError",
      code: "server_error",
      httpStatus: 500,
    });
    expect(attempts).toBe(4); // 1 initial + 3 retries
    timeoutSpy.mockRestore();
  });

  test("429 retry honors Retry-After header (seconds)", async () => {
    let attempts = 0;
    server.use(
      http.get(`${BASE}/orders/2`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { errors: [{ title: "Rate limited" }] },
            { status: 429, headers: { "Retry-After": "0" } },
          );
        }
        return HttpResponse.json(orderPayload());
      }),
    );
    const client = createLemonSqueezyClient("k");
    const timeoutSpy = vi.spyOn(global, "setTimeout").mockImplementation(((
      cb: () => void,
    ) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    const order = await client.getOrder("2");
    expect(order.id).toBe("123");
    expect(attempts).toBe(2);
    timeoutSpy.mockRestore();
  });
});

describe("verifyWebhookSignature", () => {
  const secret = "shh";
  function signed(body: string): string {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
  }

  test("valid hex signature on identical body → true", () => {
    const body = '{"meta":{"event_name":"order_created"}}';
    expect(verifyWebhookSignature(body, signed(body), secret)).toBe(true);
  });

  test("mismatched body → false (even if signature valid for other body)", () => {
    const body = '{"a":1}';
    expect(verifyWebhookSignature('{"a":2}', signed(body), secret)).toBe(false);
  });

  test("wrong secret → false", () => {
    const body = "hello";
    const sig = signed(body);
    expect(verifyWebhookSignature(body, sig, "different-secret")).toBe(false);
  });

  test("missing signature header → false", () => {
    expect(verifyWebhookSignature("body", null, secret)).toBe(false);
    expect(verifyWebhookSignature("body", "", secret)).toBe(false);
    expect(verifyWebhookSignature("body", undefined, secret)).toBe(false);
  });

  test("missing secret → false", () => {
    expect(verifyWebhookSignature("body", signed("body"), "")).toBe(false);
  });

  test("empty body → false", () => {
    expect(verifyWebhookSignature("", "deadbeef", secret)).toBe(false);
  });

  test("length mismatch (truncated signature) → false, no throw", () => {
    const body = "payload";
    const sig = signed(body).slice(0, 32); // truncated
    expect(verifyWebhookSignature(body, sig, secret)).toBe(false);
  });

  test("non-hex signature string → false, no throw", () => {
    expect(verifyWebhookSignature("body", "ZZZZ-NOT-HEX", secret)).toBe(false);
  });
});

describe("hashWebhookBody", () => {
  test("stable SHA-256 hex for identical input", () => {
    const a = hashWebhookBody("payload");
    const b = hashWebhookBody("payload");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  test("different input → different hash", () => {
    expect(hashWebhookBody("a")).not.toBe(hashWebhookBody("b"));
  });
});
