import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

vi.mock("server-only", () => ({}));

import { BrevoStatsError, createBrevoStatsClient } from "./brevo-stats";

const BREVO_BASE = "https://api.brevo.com/v3";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
});

function stubTimers() {
  return vi.spyOn(global, "setTimeout").mockImplementation(((
    cb: () => void,
  ) => {
    cb();
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof setTimeout);
}

describe("createBrevoStatsClient", () => {
  test("missing apiKey → throws BrevoStatsError(missing_api_key)", () => {
    try {
      createBrevoStatsClient("");
      throw new Error("expected throw");
    } catch (e) {
      expect((e as BrevoStatsError).name).toBe("BrevoStatsError");
      expect((e as BrevoStatsError).code).toBe("missing_api_key");
    }
  });
});

describe("getAggregatedReport", () => {
  test("happy path: passes sender + dates, normalizes missing fields to 0", async () => {
    let seenUrl = "";
    let seenApiKey = "";
    server.use(
      http.get(
        `${BREVO_BASE}/smtp/statistics/aggregatedReport`,
        ({ request }) => {
          seenUrl = request.url;
          seenApiKey = request.headers.get("api-key") ?? "";
          return HttpResponse.json({
            requests: 120,
            delivered: 100,
            hardBounces: 6,
            // softBounces, blocked, invalid, etc. omitted on purpose
          });
        },
      ),
    );
    const client = createBrevoStatsClient("k");
    const report = await client.getAggregatedReport({
      senderDomain: "example.com",
      startDate: "2026-04-19",
      endDate: "2026-04-26",
    });
    expect(seenApiKey).toBe("k");
    expect(seenUrl).toContain("sender=example.com");
    expect(seenUrl).toContain("startDate=2026-04-19");
    expect(seenUrl).toContain("endDate=2026-04-26");
    expect(report).toMatchObject({
      requests: 120,
      delivered: 100,
      hardBounces: 6,
      softBounces: 0,
      blocked: 0,
      invalid: 0,
      spamReports: 0,
      unsubscribed: 0,
    });
  });

  test("4xx error from Brevo → throws BrevoStatsError with http_<status> code", async () => {
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () =>
        HttpResponse.json(
          { code: "unauthorized", message: "Invalid API key" },
          { status: 401 },
        ),
      ),
    );
    const client = createBrevoStatsClient("bad");
    await expect(
      client.getAggregatedReport({
        senderDomain: "example.com",
        startDate: "2026-04-19",
        endDate: "2026-04-26",
      }),
    ).rejects.toMatchObject({
      name: "BrevoStatsError",
      code: "http_401",
      httpStatus: 401,
    });
  });

  test("5xx then 200 → retries and returns the second response", async () => {
    let calls = 0;
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () => {
        calls += 1;
        if (calls === 1) {
          return HttpResponse.json({ message: "Internal" }, { status: 502 });
        }
        return HttpResponse.json({ requests: 7, delivered: 7 });
      }),
    );
    const t = stubTimers();
    const client = createBrevoStatsClient("k");
    const report = await client.getAggregatedReport({
      senderDomain: "example.com",
      startDate: "2026-04-19",
      endDate: "2026-04-26",
    });
    t.mockRestore();
    expect(calls).toBe(2);
    expect(report.requests).toBe(7);
  });

  test("429 with Retry-After honored", async () => {
    let calls = 0;
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () => {
        calls += 1;
        if (calls === 1) {
          return new HttpResponse(JSON.stringify({ message: "rate limit" }), {
            status: 429,
            headers: { "retry-after": "1", "content-type": "application/json" },
          });
        }
        return HttpResponse.json({ requests: 1, delivered: 1 });
      }),
    );
    const t = stubTimers();
    const client = createBrevoStatsClient("k");
    await client.getAggregatedReport({
      senderDomain: "example.com",
      startDate: "2026-04-19",
      endDate: "2026-04-26",
    });
    t.mockRestore();
    expect(calls).toBe(2);
  });

  test("retries exhausted → throws last 5xx error", async () => {
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () =>
        HttpResponse.json({ message: "down" }, { status: 503 }),
      ),
    );
    const t = stubTimers();
    const client = createBrevoStatsClient("k");
    await expect(
      client.getAggregatedReport({
        senderDomain: "example.com",
        startDate: "2026-04-19",
        endDate: "2026-04-26",
      }),
    ).rejects.toMatchObject({ code: "http_503", httpStatus: 503 });
    t.mockRestore();
  });
});

describe("getEvents", () => {
  test("passes optional event filter + pagination params", async () => {
    let seenUrl = "";
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/events`, ({ request }) => {
        seenUrl = request.url;
        return HttpResponse.json({
          events: [
            {
              email: "a@example.com",
              date: "2026-04-26T10:00:00Z",
              event: "complaints",
            },
          ],
        });
      }),
    );
    const client = createBrevoStatsClient("k");
    const out = await client.getEvents({
      senderDomain: "example.com",
      startDate: "2026-04-19",
      endDate: "2026-04-26",
      event: "complaints",
      limit: 100,
      offset: 0,
    });
    expect(seenUrl).toContain("event=complaints");
    expect(seenUrl).toContain("limit=100");
    expect(seenUrl).toContain("offset=0");
    expect(out.events).toHaveLength(1);
    expect(out.events?.[0].event).toBe("complaints");
  });

  test("no events for range → empty array (not undefined)", async () => {
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/events`, () =>
        HttpResponse.json({ events: [] }),
      ),
    );
    const client = createBrevoStatsClient("k");
    const out = await client.getEvents({
      senderDomain: "quiet.example.com",
      startDate: "2026-04-19",
      endDate: "2026-04-26",
    });
    expect(out.events).toEqual([]);
  });
});

// Quiet an unused-import warning — exported type helper used for
// cross-file type narrowing but not referenced directly in tests.
void BrevoStatsError;
