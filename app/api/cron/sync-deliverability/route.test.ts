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

const POSTMARK_BASE = "https://api.postmarkapp.com";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-test";
  process.env.POSTMARK_TRANSACTIONAL_SERVER_TOKEN = "test-postmark-token";
  process.env.MAILKIT_SUPPORT_FROM_EMAIL = "support@mailkit-test.ru";
});

afterEach(() => {
  delete process.env.CRON_SECRET;
  delete process.env.POSTMARK_TRANSACTIONAL_SERVER_TOKEN;
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

type SetupRunRow = {
  domain: string;
  status: string;
  postmark_server_id: number | null;
  cf_state: Record<string, unknown>;
  created_at: string;
};

function makeAdminStub(init: {
  purchases?: PurchaseRow[];
  setup_runs?: SetupRunRow[];
}) {
  const tables = {
    purchases: [...(init.purchases ?? [])],
    deliverability_snapshots: [] as Array<Record<string, unknown>>,
    abuse_events: [] as Array<Record<string, unknown>>,
    setup_runs: [...(init.setup_runs ?? [])] as Array<Record<string, unknown>>,
  };
  let idCounter = 0;

  function query(name: keyof typeof tables) {
    const rows = tables[name];
    const filters: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    const ltFilters: Array<[string, unknown]> = [];
    const notFilters: Array<[string, string, unknown]> = [];
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
      not(col: string, op: string, v: unknown) {
        notFilters.push([col, op, v]);
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
      maybeSingle() {
        const recs = rows as unknown as Record<string, unknown>[];
        let out = applyFilters(recs, filters, isFilters, ltFilters, notFilters);
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
        return Promise.resolve({ data: out[0] ?? null, error: null });
      },
      then(resolve: (v: unknown) => unknown) {
        const recs = rows as unknown as Record<string, unknown>[];
        if (op === "delete") {
          const targets = applyFilters(
            recs,
            filters,
            isFilters,
            ltFilters,
            notFilters,
          );
          for (const r of targets) {
            const i = recs.indexOf(r);
            if (i >= 0) recs.splice(i, 1);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "update") {
          const targets = applyFilters(
            recs,
            filters,
            isFilters,
            ltFilters,
            notFilters,
          );
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
          let out = applyFilters(
            recs,
            filters,
            isFilters,
            ltFilters,
            notFilters,
          );
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
  nots: Array<[string, string, unknown]> = [],
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
    for (const [c, op, v] of nots) {
      if (op === "is") {
        // `.not("col", "is", null)` → exclude rows where col IS null
        if (v === null && r[c] === null) return false;
        if (v === null && r[c] === undefined) return false;
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
      setup_runs: [
        {
          domain: "ok.com",
          status: "done",
          postmark_server_id: 1,
          cf_state: { postmark: { server_token: "token-ok" } },
          created_at: "2026-04-01T00:00:00Z",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${POSTMARK_BASE}/stats/outbound`, () =>
        HttpResponse.json({
          Sent: 1000,
          Bounced: 20,
          SMTPApiErrors: 10,
          BounceRate: 0.02,
          SpamComplaintsRate: 0,
          SpamComplaints: 0,
          Opens: 0,
          UniqueOpens: 0,
          Tracked: 0,
          WithLinkTracking: 0,
          WithOpenTracking: 0,
          TotalTracked: 0,
          Unique: 0,
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
      setup_runs: [
        {
          domain: "spammy.com",
          status: "done",
          postmark_server_id: 2,
          cf_state: { postmark: { server_token: "token-spammy" } },
          created_at: "2026-04-01T00:00:00Z",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${POSTMARK_BASE}/stats/outbound`, () =>
        HttpResponse.json({
          Sent: 1000,
          Bounced: 0,
          SMTPApiErrors: 0,
          BounceRate: 0,
          SpamComplaintsRate: 0.005,
          SpamComplaints: 5, // 0.5% > 0.1%
          Opens: 0,
          UniqueOpens: 0,
          Tracked: 0,
          WithLinkTracking: 0,
          WithOpenTracking: 0,
          TotalTracked: 0,
          Unique: 0,
        }),
      ),
      http.post(`${POSTMARK_BASE}/email`, () =>
        HttpResponse.json({ MessageID: "m1" }),
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

  test("domain without postmark server_token → skipped, no snapshot", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-no-token",
          custom_data: { domain: "notoken.com" },
          status: "paid",
          suspended_at: null,
          user_email: "u@notoken.com",
          suspension_reason: null,
        },
      ],
      // No setup_runs for this domain → no server token
      setup_runs: [],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    let postmarkHits = 0;
    server.use(
      http.get(`${POSTMARK_BASE}/stats/outbound`, () => {
        postmarkHits += 1;
        return HttpResponse.json({ Sent: 100 });
      }),
    );
    const res = await GET(authedGET());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      checked: number;
      outcomes: Array<{ domain: string; error?: string }>;
    };
    expect(body.checked).toBe(1);
    expect(postmarkHits).toBe(0);
    expect(admin._tables.deliverability_snapshots).toHaveLength(0);
    const outcome = body.outcomes.find((o) => o.domain === "notoken.com");
    expect(outcome?.error).toBe("no_postmark_server_token");
  });

  test("per-domain error doesn't abort the run", async () => {
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
      setup_runs: [
        {
          domain: "down.com",
          status: "done",
          postmark_server_id: 4,
          cf_state: { postmark: { server_token: "token-down" } },
          created_at: "2026-04-01T00:00:00Z",
        },
        {
          domain: "up.com",
          status: "done",
          postmark_server_id: 5,
          cf_state: { postmark: { server_token: "token-up" } },
          created_at: "2026-04-01T00:00:00Z",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    server.use(
      http.get(`${POSTMARK_BASE}/stats/outbound`, ({ request }) => {
        const token = request.headers.get("x-postmark-server-token");
        if (token === "token-down") {
          return HttpResponse.json({ Message: "5xx" }, { status: 502 });
        }
        return HttpResponse.json({
          Sent: 200,
          Bounced: 0,
          SMTPApiErrors: 0,
          BounceRate: 0,
          SpamComplaintsRate: 0,
          SpamComplaints: 0,
          Opens: 0,
          UniqueOpens: 0,
          Tracked: 0,
          WithLinkTracking: 0,
          WithOpenTracking: 0,
          TotalTracked: 0,
          Unique: 0,
        });
      }),
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
