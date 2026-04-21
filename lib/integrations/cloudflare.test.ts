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

import { CloudflareError, createCloudflareClient } from "./cloudflare";

const BASE = "https://api.cloudflare.com/client/v4";

const envelopeOk = <T>(result: T) => ({
  success: true,
  errors: [],
  messages: [],
  result,
});

const envelopeErr = (code: number, message: string) => ({
  success: false,
  errors: [{ code, message }],
  messages: [],
  result: null,
});

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("createCloudflareClient", () => {
  test("throws CloudflareError when token is missing", () => {
    expect(() => createCloudflareClient("")).toThrow(CloudflareError);
  });

  test("listZones filters by status=active and returns result array", async () => {
    server.use(
      http.get(`${BASE}/zones`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("status")).toBe("active");
        expect(request.headers.get("authorization")).toBe("Bearer tok");
        return HttpResponse.json(
          envelopeOk([
            {
              id: "z1",
              name: "example.com",
              status: "active",
              account: { id: "acc1", name: "Acc" },
            },
          ]),
        );
      }),
    );

    const client = createCloudflareClient("tok");
    const zones = await client.listZones();
    expect(zones).toHaveLength(1);
    expect(zones[0].id).toBe("z1");
  });

  test("listZones on 401 throws CloudflareError without retry", async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/zones`, () => {
        calls += 1;
        return HttpResponse.json(envelopeErr(10000, "Invalid API token"), {
          status: 401,
        });
      }),
    );

    const client = createCloudflareClient("badtok");
    await expect(client.listZones()).rejects.toMatchObject({
      name: "CloudflareError",
      httpStatus: 401,
      code: 10000,
      message: "Invalid API token",
    });
    expect(calls).toBe(1);
  });

  test("429 triggers exp backoff retry up to 3 attempts then succeeds", async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(`${BASE}/zones`, () => {
        calls += 1;
        if (calls < 3) {
          return HttpResponse.json(envelopeErr(10013, "Rate limited"), {
            status: 429,
          });
        }
        return HttpResponse.json(
          envelopeOk([
            {
              id: "z1",
              name: "a.com",
              status: "active",
              account: { id: "acc1", name: "Acc" },
            },
          ]),
        );
      }),
    );

    const client = createCloudflareClient("tok");
    const promise = client.listZones();
    // Drain 1s + 2s backoffs
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    const zones = await promise;
    expect(zones).toHaveLength(1);
    expect(calls).toBe(3);
    vi.useRealTimers();
  });

  test("5xx retries then surfaces CloudflareError after exhaustion", async () => {
    vi.useFakeTimers();
    let calls = 0;
    server.use(
      http.get(`${BASE}/zones`, () => {
        calls += 1;
        return HttpResponse.json(envelopeErr(500, "Internal"), { status: 500 });
      }),
    );

    const client = createCloudflareClient("tok");
    const promise = client.listZones().catch((e) => e);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    const err = await promise;
    expect(err).toBeInstanceOf(CloudflareError);
    expect(err.httpStatus).toBe(500);
    expect(calls).toBe(4); // 1 initial + 3 retries
    vi.useRealTimers();
  });

  test("enableEmailRouting is idempotent: returns skipped=true when already enabled", async () => {
    let enableCalled = false;
    server.use(
      http.get(`${BASE}/zones/z1/email/routing`, () =>
        HttpResponse.json(envelopeOk({ enabled: true, status: "ready" })),
      ),
      http.post(`${BASE}/zones/z1/email/routing/enable`, () => {
        enableCalled = true;
        return HttpResponse.json(
          envelopeOk({ enabled: true, status: "ready" }),
        );
      }),
    );

    const client = createCloudflareClient("tok");
    const result = await client.enableEmailRouting("z1");
    expect(result.skipped).toBe(true);
    expect(result.status.enabled).toBe(true);
    expect(enableCalled).toBe(false);
  });

  test("enableEmailRouting calls POST when not yet enabled", async () => {
    let enableCalled = false;
    server.use(
      http.get(`${BASE}/zones/z1/email/routing`, () =>
        HttpResponse.json(envelopeOk({ enabled: false, status: "unlocked" })),
      ),
      http.post(`${BASE}/zones/z1/email/routing/enable`, () => {
        enableCalled = true;
        return HttpResponse.json(
          envelopeOk({ enabled: true, status: "ready" }),
        );
      }),
    );

    const client = createCloudflareClient("tok");
    const result = await client.enableEmailRouting("z1");
    expect(result.skipped).toBe(false);
    expect(result.status.enabled).toBe(true);
    expect(enableCalled).toBe(true);
  });

  test("listDnsRecords passes type + name filter via query", async () => {
    server.use(
      http.get(`${BASE}/zones/z1/dns_records`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("type")).toBe("MX");
        expect(url.searchParams.get("name")).toBe("example.com");
        return HttpResponse.json(envelopeOk([]));
      }),
    );

    const client = createCloudflareClient("tok");
    const records = await client.listDnsRecords("z1", {
      type: "MX",
      name: "example.com",
    });
    expect(records).toEqual([]);
  });

  test("createDnsRecord POSTs record body and returns created record", async () => {
    server.use(
      http.post(`${BASE}/zones/z1/dns_records`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body.type).toBe("TXT");
        expect(body.name).toBe("@");
        return HttpResponse.json(
          envelopeOk({
            id: "rec1",
            type: "TXT",
            name: "example.com",
            content: "v=spf1 ~all",
            ttl: 1,
          }),
        );
      }),
    );

    const client = createCloudflareClient("tok");
    const rec = await client.createDnsRecord("z1", {
      type: "TXT",
      name: "@",
      content: "v=spf1 ~all",
    });
    expect(rec.id).toBe("rec1");
  });

  test("updateDnsRecord PUTs with record id in path", async () => {
    server.use(
      http.put(`${BASE}/zones/z1/dns_records/rec1`, () =>
        HttpResponse.json(
          envelopeOk({
            id: "rec1",
            type: "TXT",
            name: "example.com",
            content: "v=spf1 include:_spf.mx.cloudflare.net ~all",
            ttl: 1,
          }),
        ),
      ),
    );

    const client = createCloudflareClient("tok");
    const rec = await client.updateDnsRecord("z1", "rec1", {
      type: "TXT",
      name: "@",
      content: "v=spf1 include:_spf.mx.cloudflare.net ~all",
    });
    expect(rec.content).toContain("cloudflare.net");
  });

  test("listEmailRoutingRules returns rules array", async () => {
    server.use(
      http.get(`${BASE}/zones/z1/email/routing/rules`, () =>
        HttpResponse.json(
          envelopeOk([
            {
              id: "r1",
              enabled: true,
              matchers: [{ type: "literal", field: "to", value: "hi@a.com" }],
              actions: [{ type: "forward", value: ["me@gmail.com"] }],
            },
          ]),
        ),
      ),
    );

    const client = createCloudflareClient("tok");
    const rules = await client.listEmailRoutingRules("z1");
    expect(rules).toHaveLength(1);
    expect(rules[0].enabled).toBe(true);
  });

  test("createEmailRoutingRule POSTs rule and returns created", async () => {
    server.use(
      http.post(`${BASE}/zones/z1/email/routing/rules`, async ({ request }) => {
        const body = (await request.json()) as { enabled: boolean };
        expect(body.enabled).toBe(true);
        return HttpResponse.json(
          envelopeOk({
            id: "r2",
            enabled: true,
            matchers: [{ type: "literal", field: "to", value: "hello@a.com" }],
            actions: [{ type: "forward", value: ["me@gmail.com"] }],
          }),
        );
      }),
    );

    const client = createCloudflareClient("tok");
    const rule = await client.createEmailRoutingRule("z1", {
      enabled: true,
      matchers: [{ type: "literal", field: "to", value: "hello@a.com" }],
      actions: [{ type: "forward", value: ["me@gmail.com"] }],
    });
    expect(rule.id).toBe("r2");
  });

  test("listEmailRoutingDestinations hits /accounts/:id/email/routing/addresses", async () => {
    server.use(
      http.get(`${BASE}/accounts/acc1/email/routing/addresses`, () =>
        HttpResponse.json(
          envelopeOk([
            { email: "me@gmail.com", verified: "2026-04-20T00:00:00Z" },
          ]),
        ),
      ),
    );

    const client = createCloudflareClient("tok");
    const dests = await client.listEmailRoutingDestinations("acc1");
    expect(dests[0].email).toBe("me@gmail.com");
    expect(dests[0].verified).not.toBeNull();
  });

  test("createEmailRoutingDestination POSTs { email } and returns unverified", async () => {
    server.use(
      http.post(
        `${BASE}/accounts/acc1/email/routing/addresses`,
        async ({ request }) => {
          const body = (await request.json()) as { email: string };
          expect(body.email).toBe("new@gmail.com");
          return HttpResponse.json(
            envelopeOk({ email: "new@gmail.com", verified: null }),
          );
        },
      ),
    );

    const client = createCloudflareClient("tok");
    const dest = await client.createEmailRoutingDestination(
      "acc1",
      "new@gmail.com",
    );
    expect(dest.verified).toBeNull();
  });
});
