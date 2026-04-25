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

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import * as sbModule from "@/lib/supabase/server";
import { GET } from "./route";

const BREVO_BASE = "https://api.brevo.com/v3";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-test";
  process.env.BREVO_API_KEY = "k";
  process.env.MAILKIT_SUPPORT_FROM_EMAIL = "support@mailkit-test.ru";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.BREVO_API_KEY;
  delete process.env.MAILKIT_SUPPORT_FROM_EMAIL;
});

type PurchaseRow = {
  id: string;
  custom_data: Record<string, unknown>;
  status: string;
  suspended_at: string | null;
  user_email: string;
};

function makeAdminStub(init: { purchases?: PurchaseRow[] }) {
  const tables = {
    purchases: [...(init.purchases ?? [])],
    send_counters: [] as Array<{
      domain: string;
      window_type: string;
      window_start: string;
      count: number;
      synced_at: string;
    }>,
    abuse_events: [] as Array<Record<string, unknown>>,
  };

  function query(name: keyof typeof tables) {
    const rows = tables[name];
    const filters: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    const containsFilters: Array<Record<string, unknown>> = [];
    let op: "select" | "insert" | "update" | "upsert" | null = null;
    let payload: unknown = null;
    let order: { col: string; ascending: boolean } | undefined;
    let limitN: number | undefined;

    const api: Record<string, unknown> = {
      select() {
        if (!op) op = "select";
        return api;
      },
      insert(data: unknown) {
        op = "insert";
        payload = data;
        return api;
      },
      update(data: unknown) {
        op = "update";
        payload = data;
        return api;
      },
      upsert(data: unknown) {
        op = "upsert";
        payload = data;
        return api;
      },
      eq(col: string, v: unknown) {
        filters.push([col, v]);
        return api;
      },
      is(col: string, v: unknown) {
        isFilters.push([col, v]);
        return api;
      },
      contains(_col: string, v: Record<string, unknown>) {
        containsFilters.push(v);
        return api;
      },
      order(col: string, opts: { ascending: boolean }) {
        order = { col, ascending: opts.ascending };
        return api;
      },
      limit(n: number) {
        limitN = n;
        return api;
      },
      then(resolve: (v: unknown) => unknown) {
        const recs = rows as unknown as Record<string, unknown>[];
        if (op === "update") {
          const targets = applyFilters(recs, filters, isFilters);
          for (const r of targets)
            Object.assign(r, payload as Record<string, unknown>);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "insert") {
          const row = {
            id: `row-${rows.length + 1}`,
            ...(payload as Record<string, unknown>),
          };
          recs.push(row);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "upsert") {
          const data = payload as Record<string, unknown>;
          const existing = recs.find(
            (r) =>
              r.domain === data.domain &&
              r.window_type === data.window_type &&
              r.window_start === data.window_start,
          );
          if (existing) {
            Object.assign(existing, data);
          } else {
            recs.push({ id: `row-${rows.length + 1}`, ...data });
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "select") {
          let out = applyFilters(recs, filters, isFilters);
          if (containsFilters.length > 0) {
            out = out.filter((r) => {
              const cd = (r.custom_data ?? {}) as Record<string, unknown>;
              return containsFilters.every((c) =>
                Object.entries(c).every(([k, v]) => cd[k] === v),
              );
            });
          }
          if (order) {
            out = [...out].sort((a, b) => {
              const av = a[order!.col] as string;
              const bv = b[order!.col] as string;
              return order!.ascending
                ? av < bv
                  ? -1
                  : av > bv
                    ? 1
                    : 0
                : av > bv
                  ? -1
                  : av < bv
                    ? 1
                    : 0;
            });
          }
          if (typeof limitN === "number") out = out.slice(0, limitN);
          return Promise.resolve({ data: out, error: null }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return api;
  }

  return {
    from(name: string) {
      return query(name as keyof typeof tables);
    },
    _tables: tables,
  };
}

function applyFilters(
  rows: Record<string, unknown>[],
  eqs: Array<[string, unknown]>,
  iss: Array<[string, unknown]>,
): Record<string, unknown>[] {
  return rows.filter((r) => {
    for (const [c, v] of eqs) if (r[c] !== v) return false;
    for (const [c, v] of iss) if (r[c] !== v) return false;
    return true;
  });
}

function authedGET(headers?: Record<string, string>): Request {
  return new Request("https://x.test/api/cron/sync-send-counters", {
    headers: { authorization: "Bearer cron-test", ...(headers ?? {}) },
  });
}

describe("GET /api/cron/sync-send-counters", () => {
  test("missing CRON_SECRET → 500", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(authedGET());
    expect(res.status).toBe(500);
  });

  test("wrong bearer → 401", async () => {
    const res = await GET(
      new Request("https://x.test/api/cron/sync-send-counters", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(res.status).toBe(401);
  });

  test("missing BREVO_API_KEY → 500", async () => {
    delete process.env.BREVO_API_KEY;
    const admin = makeAdminStub({});
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(500);
  });

  test("under-limit domain: counter upserted, no suspend", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p1",
          custom_data: { domain: "ex.com" },
          status: "paid",
          suspended_at: null,
          user_email: "buyer@example.com",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () =>
        HttpResponse.json({ requests: 100, delivered: 100 }),
      ),
    );

    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      checked: number;
      suspended: number;
      outcomes: Array<{ domain: string; dayCount: number; suspended: boolean }>;
    };
    expect(body.checked).toBe(1);
    expect(body.suspended).toBe(0);
    expect(body.outcomes[0].dayCount).toBe(100);
    expect(admin._tables.send_counters).toHaveLength(1);
    expect(admin._tables.send_counters[0].count).toBe(100);
    expect(admin._tables.abuse_events).toHaveLength(0);
  });

  test("over-day-limit domain: counter written + suspend triggered", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-busy",
          custom_data: { domain: "noisy.com" },
          status: "paid",
          suspended_at: null,
          user_email: "buyer@noisy.com",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () =>
        HttpResponse.json({ requests: 600, delivered: 600 }),
      ),
      http.post(`${BREVO_BASE}/smtp/email`, () =>
        HttpResponse.json({ messageId: "m1" }),
      ),
    );

    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    expect(admin._tables.send_counters[0].count).toBe(600);
    // Audit row written by abuse-suspend
    expect(admin._tables.abuse_events).toHaveLength(1);
    expect(admin._tables.abuse_events[0].event_type).toBe("rate_limit_block");
    // Purchase flagged
    expect(admin._tables.purchases[0].suspended_at).not.toBeNull();
  });

  test("purchase without custom_data.domain is skipped (no Brevo call)", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-no-domain",
          custom_data: {},
          status: "paid",
          suspended_at: null,
          user_email: "buyer@x.com",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    let brevoHits = 0;
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () => {
        brevoHits += 1;
        return HttpResponse.json({ requests: 1 });
      }),
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { checked: number };
    expect(body.checked).toBe(0);
    expect(brevoHits).toBe(0);
  });

  test("Brevo failure for one domain doesn't abort others", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p1",
          custom_data: { domain: "a.com" },
          status: "paid",
          suspended_at: null,
          user_email: "a@a.com",
        },
        {
          id: "p2",
          custom_data: { domain: "b.com" },
          status: "paid",
          suspended_at: null,
          user_email: "b@b.com",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(
        `${BREVO_BASE}/smtp/statistics/aggregatedReport`,
        ({ request }) => {
          const url = new URL(request.url);
          if (url.searchParams.get("sender") === "a.com") {
            return HttpResponse.json({ message: "down" }, { status: 502 });
          }
          return HttpResponse.json({ requests: 50 });
        },
      ),
    );
    const t = vi.spyOn(global, "setTimeout").mockImplementation(((
      cb: () => void,
    ) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    const res = await GET(authedGET());
    t.mockRestore();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      checked: number;
      outcomes: Array<{
        domain: string;
        suspended: boolean;
        error?: string;
      }>;
    };
    expect(body.checked).toBe(2);
    const aOutcome = body.outcomes.find((o) => o.domain === "a.com");
    const bOutcome = body.outcomes.find((o) => o.domain === "b.com");
    expect(aOutcome?.error).toBeDefined();
    expect(bOutcome?.error).toBeUndefined();
    // b.com counter still upserted
    expect(admin._tables.send_counters.some((c) => c.domain === "b.com")).toBe(
      true,
    );
  });

  test("already-suspended purchases excluded from sync (suspended_at IS NOT NULL filter)", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-suspended",
          custom_data: { domain: "blocked.com" },
          status: "paid",
          suspended_at: "2026-04-25T12:00:00Z",
          user_email: "x@blocked.com",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    let brevoHits = 0;
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () => {
        brevoHits += 1;
        return HttpResponse.json({ requests: 1 });
      }),
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { checked: number };
    expect(body.checked).toBe(0);
    expect(brevoHits).toBe(0);
  });
});
