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
  suspension_reason: string | null;
};

function makeAdminStub(init: { purchases?: PurchaseRow[] }) {
  const tables = {
    purchases: [...(init.purchases ?? [])],
    deliverability_snapshots: [] as Array<Record<string, unknown>>,
    abuse_events: [] as Array<Record<string, unknown>>,
  };
  let idCounter = 0;

  function query(name: keyof typeof tables) {
    const rows = tables[name];
    const filters: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    const ltFilters: Array<[string, unknown]> = [];
    const containsFilters: Array<Record<string, unknown>> = [];
    let op: "select" | "insert" | "update" | "delete" | null = null;
    let payload: unknown = null;
    let order: { col: string; ascending: boolean } | undefined;
    let limitN: number | undefined;
    let selectColumns = "";

    const api: Record<string, unknown> = {
      select(cols?: string) {
        if (!op) op = "select";
        selectColumns = cols ?? "";
        // Allow chaining for `.insert(...).select(...).limit(...)`
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
      delete() {
        op = "delete";
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
      lt(col: string, v: unknown) {
        ltFilters.push([col, v]);
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
        if (op === "delete") {
          const targets = applyFilters(recs, filters, isFilters, ltFilters);
          for (const r of targets) {
            const i = recs.indexOf(r);
            if (i >= 0) recs.splice(i, 1);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "update") {
          const targets = applyFilters(recs, filters, isFilters, ltFilters);
          for (const r of targets)
            Object.assign(r, payload as Record<string, unknown>);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "insert") {
          idCounter += 1;
          const inserted = {
            id: `row-${idCounter}`,
            ...(payload as Record<string, unknown>),
          };
          recs.push(inserted);
          // Mock the Supabase pattern `.insert(...).select('id').limit(1)`
          if (selectColumns) {
            return Promise.resolve({ data: [inserted], error: null }).then(
              resolve,
            );
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "select") {
          let out = applyFilters(recs, filters, isFilters, ltFilters);
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
  lts: Array<[string, unknown]>,
): Record<string, unknown>[] {
  return rows.filter((r) => {
    for (const [c, v] of eqs) if (r[c] !== v) return false;
    for (const [c, v] of iss) if (r[c] !== v) return false;
    for (const [c, v] of lts) {
      const rv = r[c];
      if (typeof rv === "string" && typeof v === "string") {
        if (!(rv < v)) return false;
      } else {
        return false;
      }
    }
    return true;
  });
}

function authedGET(): Request {
  return new Request("https://x.test/api/cron/sync-deliverability", {
    headers: { authorization: "Bearer cron-test" },
  });
}

describe("GET /api/cron/sync-deliverability", () => {
  test("missing CRON_SECRET → 500", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(authedGET());
    expect(res.status).toBe(500);
  });

  test("wrong bearer → 401", async () => {
    const res = await GET(
      new Request("https://x.test/api/cron/sync-deliverability", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(res.status).toBe(401);
  });

  test("under all thresholds → snapshot insert with action_taken=null, no audit", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p1",
          custom_data: { domain: "ok.com" },
          status: "paid",
          suspended_at: null,
          user_email: "u@ok.com",
          suspension_reason: null,
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () =>
        HttpResponse.json({
          requests: 1000,
          delivered: 970,
          hardBounces: 20,
          softBounces: 10,
          spamReports: 0,
          unsubscribed: 5,
        }),
      ),
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    expect(admin._tables.deliverability_snapshots).toHaveLength(1);
    expect(admin._tables.deliverability_snapshots[0].action_taken).toBeNull();
    expect(admin._tables.abuse_events).toHaveLength(0);
  });

  test("complaint threshold exceeded → snapshot + suspend audit + email", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-bad",
          custom_data: { domain: "spammy.com" },
          status: "paid",
          suspended_at: null,
          user_email: "u@spammy.com",
          suspension_reason: null,
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () =>
        HttpResponse.json({
          requests: 1000,
          delivered: 990,
          spamReports: 5, // 0.5% > 0.1%
        }),
      ),
      http.post(`${BREVO_BASE}/smtp/email`, () =>
        HttpResponse.json({ messageId: "m1" }),
      ),
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    expect(admin._tables.deliverability_snapshots[0].action_taken).toBe(
      "suspended",
    );
    expect(admin._tables.abuse_events[0].event_type).toBe(
      "complaint_threshold",
    );
    // FK linkage: abuse audit row points at the snapshot row.
    expect(admin._tables.abuse_events[0].snapshot_id).toBe(
      admin._tables.deliverability_snapshots[0].id,
    );
    // Purchase suspended.
    expect(admin._tables.purchases[0].suspended_at).not.toBeNull();
  });

  test("unsubscribe-only over → action='warned', purchase NOT suspended", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-warn",
          custom_data: { domain: "noisy.com" },
          status: "paid",
          suspended_at: null,
          user_email: "u@noisy.com",
          suspension_reason: null,
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${BREVO_BASE}/smtp/statistics/aggregatedReport`, () =>
        HttpResponse.json({
          requests: 1000,
          unsubscribed: 25, // 2.5% > 2%
        }),
      ),
      http.post(`${BREVO_BASE}/smtp/email`, () =>
        HttpResponse.json({ messageId: "m1" }),
      ),
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    expect(admin._tables.deliverability_snapshots[0].action_taken).toBe(
      "warned",
    );
    expect(admin._tables.abuse_events[0].action_taken).toBe("warned");
    expect(admin._tables.purchases[0].suspended_at).toBeNull();
  });

  test("per-domain Brevo error doesn't abort the run", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p1",
          custom_data: { domain: "down.com" },
          status: "paid",
          suspended_at: null,
          user_email: "u@down.com",
          suspension_reason: null,
        },
        {
          id: "p2",
          custom_data: { domain: "up.com" },
          status: "paid",
          suspended_at: null,
          user_email: "u@up.com",
          suspension_reason: null,
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
          if (url.searchParams.get("sender") === "down.com") {
            return HttpResponse.json({ message: "5xx" }, { status: 502 });
          }
          return HttpResponse.json({ requests: 200 });
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
      outcomes: Array<{ domain: string; error?: string }>;
    };
    expect(body.checked).toBe(2);
    const downOutcome = body.outcomes.find((o) => o.domain === "down.com");
    expect(downOutcome?.error).toBeDefined();
    // Snapshot should still be inserted for the healthy domain.
    expect(
      admin._tables.deliverability_snapshots.some((s) => s.domain === "up.com"),
    ).toBe(true);
  });

  test("retention sweep: 90+day-old snapshot deleted", async () => {
    const admin = makeAdminStub({ purchases: [] });
    // Pre-seed an old + a fresh snapshot.
    const oldDate = new Date(
      Date.now() - 100 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const freshDate = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    admin._tables.deliverability_snapshots.push(
      { id: "old", domain: "old.com", measured_at: oldDate },
      { id: "fresh", domain: "fresh.com", measured_at: freshDate },
    );
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    const ids = admin._tables.deliverability_snapshots.map((s) => s.id);
    expect(ids).toContain("fresh");
    expect(ids).not.toContain("old");
  });
});
