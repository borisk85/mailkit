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

import { actOnDeliverability, suspendForRateLimit } from "./abuse-suspend";
import {
  type DeliverabilityEvaluation,
  DEFAULT_DELIVERABILITY_THRESHOLDS,
} from "./deliverability";
import type { SendLimitEvaluation } from "./send-limits";

const POSTMARK_BASE = "https://api.postmarkapp.com";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  vi.clearAllMocks();
  process.env.POSTMARK_TRANSACTIONAL_SERVER_TOKEN = "test-postmark-token";
  process.env.MAILKIT_SUPPORT_FROM_EMAIL = "support@mailkit-test.ru";
  process.env.MAILKIT_SUPPORT_FROM_NAME = "MailKit support";
});

afterEach(() => {
  delete process.env.POSTMARK_TRANSACTIONAL_SERVER_TOKEN;
  delete process.env.MAILKIT_SUPPORT_FROM_EMAIL;
  delete process.env.MAILKIT_SUPPORT_FROM_NAME;
});

type PurchaseRow = {
  id: string;
  user_email: string;
  custom_data: Record<string, unknown>;
  created_at: string;
  status: string;
  suspended_at: string | null;
  suspension_reason: string | null;
};

type AbuseEventRow = {
  id: string;
  domain: string;
  event_type: string;
  action_taken: string;
  threshold_value: number | null;
  observed_value: number | null;
  purchase_id: string | null;
  snapshot_id: string | null;
  notes: string | null;
};

function makeAdmin(init: {
  purchases?: PurchaseRow[];
  abuse_events?: AbuseEventRow[];
}) {
  const tables = {
    purchases: [...(init.purchases ?? [])],
    abuse_events: [...(init.abuse_events ?? [])],
  };

  function query(name: keyof typeof tables) {
    const rows = tables[name];
    const filters: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    const containsFilters: Array<Record<string, unknown>> = [];
    let op: "select" | "update" | "insert" | null = null;
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
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return api;
      },
      is(col: string, val: unknown) {
        isFilters.push([col, val]);
        return api;
      },
      contains(_col: string, val: Record<string, unknown>) {
        containsFilters.push(val);
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
        const rowsAsRecords = rows as unknown as Record<string, unknown>[];
        if (op === "update") {
          const targets = applyFilters(rowsAsRecords, filters, isFilters);
          for (const r of targets)
            Object.assign(r, payload as Record<string, unknown>);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "insert") {
          const row = {
            id: `row-${rows.length + 1}`,
            ...(payload as Record<string, unknown>),
          };
          rowsAsRecords.push(row);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "select") {
          let out = applyFilters(rowsAsRecords, filters, isFilters);
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

function purchase(overrides: Partial<PurchaseRow> = {}): PurchaseRow {
  return {
    id: "p1",
    user_email: "buyer@example.com",
    custom_data: { domain: "ex.com" },
    created_at: "2026-04-26T10:00:00Z",
    status: "paid",
    suspended_at: null,
    suspension_reason: null,
    ...overrides,
  };
}

describe("suspendForRateLimit", () => {
  function rateEval(
    overrides: Partial<SendLimitEvaluation> = {},
  ): SendLimitEvaluation {
    return {
      overLimit: true,
      exceeded: ["minute"],
      windows: {
        day: { count: 0, limit: 500, windowStart: null },
        hour: { count: 0, limit: 50, windowStart: null },
        minute: {
          count: 6,
          limit: 5,
          windowStart: "2026-04-26T17:42:00.000Z",
        },
      },
      ...overrides,
    };
  }

  test("not over limit → no-op", async () => {
    const admin = makeAdmin({ purchases: [purchase()] });
    const r = await suspendForRateLimit(
      admin as unknown as Parameters<typeof suspendForRateLimit>[0],
      {
        domain: "ex.com",
        evaluation: { ...rateEval(), overLimit: false, exceeded: [] },
      },
    );
    expect(r.suspended).toBe(false);
    expect(admin._tables.abuse_events).toHaveLength(0);
    expect(admin._tables.purchases[0].suspended_at).toBeNull();
  });

  test("happy path: minute window tripped → flag + audit + email attempt", async () => {
    let emailSent = false;
    server.use(
      http.post(`${POSTMARK_BASE}/email`, async ({ request }) => {
        const body = (await request.json()) as { Subject?: string };
        emailSent = !!body.Subject?.includes("temporarily paused");
        return HttpResponse.json({ MessageID: "m1" });
      }),
    );

    const admin = makeAdmin({ purchases: [purchase()] });
    const r = await suspendForRateLimit(
      admin as unknown as Parameters<typeof suspendForRateLimit>[0],
      {
        domain: "ex.com",
        evaluation: rateEval(),
      },
    );

    expect(r.suspended).toBe(true);
    expect(r.emailed).toBe(true);
    expect(emailSent).toBe(true);
    expect(admin._tables.purchases[0].suspended_at).not.toBeNull();
    expect(admin._tables.purchases[0].suspension_reason).toBe("rate_limit");
    expect(admin._tables.abuse_events).toHaveLength(1);
    const ev = admin._tables.abuse_events[0];
    expect(ev.event_type).toBe("rate_limit_block");
    expect(ev.action_taken).toBe("suspended");
    expect(ev.threshold_value).toBe(5);
    expect(ev.observed_value).toBe(6);
  });

  test("most-restrictive window picked when multiple tripped", async () => {
    server.use(
      http.post(`${POSTMARK_BASE}/email`, () =>
        HttpResponse.json({ MessageID: "m1" }),
      ),
    );
    const admin = makeAdmin({ purchases: [purchase()] });
    const evaluation = rateEval({
      exceeded: ["day", "hour", "minute"],
      windows: {
        day: { count: 600, limit: 500, windowStart: "2026-04-26T00:00:00Z" },
        hour: { count: 80, limit: 50, windowStart: "2026-04-26T17:00:00Z" },
        minute: { count: 7, limit: 5, windowStart: "2026-04-26T17:42:00Z" },
      },
    });
    await suspendForRateLimit(
      admin as unknown as Parameters<typeof suspendForRateLimit>[0],
      { domain: "ex.com", evaluation },
    );
    const ev = admin._tables.abuse_events[0];
    // Minute is most-restrictive (shortest reset).
    expect(ev.notes).toContain("window=minute");
    expect(ev.threshold_value).toBe(5);
    expect(ev.observed_value).toBe(7);
  });

  test("no purchase for domain → audit row still written, suspended=false", async () => {
    const admin = makeAdmin({
      purchases: [purchase({ custom_data: { domain: "other.com" } })],
    });
    const r = await suspendForRateLimit(
      admin as unknown as Parameters<typeof suspendForRateLimit>[0],
      { domain: "ex.com", evaluation: rateEval() },
    );
    expect(r.suspended).toBe(false);
    expect(r.emailed).toBe(false);
    expect(admin._tables.abuse_events).toHaveLength(1);
    expect(admin._tables.abuse_events[0].purchase_id).toBeNull();
  });

  test("already-suspended purchase: audit row written, flag NOT overwritten", async () => {
    server.use(
      http.post(`${POSTMARK_BASE}/email`, () =>
        HttpResponse.json({ MessageID: "m1" }),
      ),
    );
    const admin = makeAdmin({
      purchases: [
        purchase({
          suspended_at: "2026-04-20T00:00:00Z",
          suspension_reason: "complaint_threshold",
        }),
      ],
    });
    await suspendForRateLimit(
      admin as unknown as Parameters<typeof suspendForRateLimit>[0],
      { domain: "ex.com", evaluation: rateEval() },
    );
    // First-suspension reason wins (idempotent).
    expect(admin._tables.purchases[0].suspended_at).toBe(
      "2026-04-20T00:00:00Z",
    );
    expect(admin._tables.purchases[0].suspension_reason).toBe(
      "complaint_threshold",
    );
    // But the new event is still recorded (repeat-offender visibility).
    expect(admin._tables.abuse_events).toHaveLength(1);
  });

  test("Brevo email failure does not block suspension", async () => {
    server.use(
      http.post(`${POSTMARK_BASE}/email`, () =>
        HttpResponse.json({ message: "down" }, { status: 503 }),
      ),
    );
    const admin = makeAdmin({ purchases: [purchase()] });
    const t = vi.spyOn(global, "setTimeout").mockImplementation(((
      cb: () => void,
    ) => {
      cb();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    const r = await suspendForRateLimit(
      admin as unknown as Parameters<typeof suspendForRateLimit>[0],
      { domain: "ex.com", evaluation: rateEval() },
    );
    t.mockRestore();
    expect(r.suspended).toBe(true);
    expect(r.emailed).toBe(false);
    expect(admin._tables.purchases[0].suspended_at).not.toBeNull();
    expect(admin._tables.abuse_events).toHaveLength(1);
  });
});

describe("actOnDeliverability", () => {
  function deliv(
    overrides: Partial<DeliverabilityEvaluation> = {},
  ): DeliverabilityEvaluation {
    return {
      action: "suspended",
      reason: "complaint_threshold",
      rates: { bounce: 1, complaint: 0.5, unsubscribe: 0.2 },
      counts: {
        requests: 1000,
        bounced: 10,
        complained: 5,
        unsubscribed: 2,
      },
      thresholds: DEFAULT_DELIVERABILITY_THRESHOLDS,
      ...overrides,
    };
  }

  test("action=null → no-op", async () => {
    const admin = makeAdmin({ purchases: [purchase()] });
    const r = await actOnDeliverability(
      admin as unknown as Parameters<typeof actOnDeliverability>[0],
      {
        domain: "ex.com",
        evaluation: deliv({ action: null, reason: null }),
      },
    );
    expect(r.acted).toBe(false);
    expect(admin._tables.abuse_events).toHaveLength(0);
    expect(admin._tables.purchases[0].suspended_at).toBeNull();
  });

  test("complaint suspended → DB flag + audit + complaint email", async () => {
    let subjectSeen = "";
    server.use(
      http.post(`${POSTMARK_BASE}/email`, async ({ request }) => {
        const body = (await request.json()) as { Subject?: string };
        subjectSeen = body.Subject ?? "";
        return HttpResponse.json({ MessageID: "m1" });
      }),
    );
    const admin = makeAdmin({ purchases: [purchase()] });
    const r = await actOnDeliverability(
      admin as unknown as Parameters<typeof actOnDeliverability>[0],
      { domain: "ex.com", evaluation: deliv(), snapshotId: "snap-1" },
    );
    expect(r.acted).toBe(true);
    expect(subjectSeen).toContain("Deliverability issue");
    expect(admin._tables.purchases[0].suspension_reason).toBe(
      "complaint_threshold",
    );
    const ev = admin._tables.abuse_events[0];
    expect(ev.event_type).toBe("complaint_threshold");
    expect(ev.action_taken).toBe("suspended");
    expect(ev.snapshot_id).toBe("snap-1");
    // Driving rate / threshold = complaint, not the bounce rate.
    expect(ev.observed_value).toBeCloseTo(0.5, 5);
    expect(ev.threshold_value).toBeCloseTo(0.1, 5);
  });

  test("bounce suspended → bounce email + bounce_threshold audit", async () => {
    let subjectSeen = "";
    server.use(
      http.post(`${POSTMARK_BASE}/email`, async ({ request }) => {
        const body = (await request.json()) as { Subject?: string };
        subjectSeen = body.Subject ?? "";
        return HttpResponse.json({ MessageID: "m1" });
      }),
    );
    const admin = makeAdmin({ purchases: [purchase()] });
    await actOnDeliverability(
      admin as unknown as Parameters<typeof actOnDeliverability>[0],
      {
        domain: "ex.com",
        evaluation: deliv({
          reason: "bounce_threshold",
          rates: { bounce: 7, complaint: 0, unsubscribe: 0 },
        }),
      },
    );
    expect(subjectSeen).toContain("Deliverability issue");
    const ev = admin._tables.abuse_events[0];
    expect(ev.event_type).toBe("bounce_threshold");
    expect(ev.observed_value).toBeCloseTo(7, 5);
  });

  test("warned (unsubscribe over): no DB flag flip, warn email sent", async () => {
    let subjectSeen = "";
    server.use(
      http.post(`${POSTMARK_BASE}/email`, async ({ request }) => {
        const body = (await request.json()) as { Subject?: string };
        subjectSeen = body.Subject ?? "";
        return HttpResponse.json({ MessageID: "m1" });
      }),
    );
    const admin = makeAdmin({ purchases: [purchase()] });
    await actOnDeliverability(
      admin as unknown as Parameters<typeof actOnDeliverability>[0],
      {
        domain: "ex.com",
        evaluation: deliv({
          action: "warned",
          reason: "unsubscribe_threshold",
          rates: { bounce: 0, complaint: 0, unsubscribe: 3 },
        }),
      },
    );
    expect(subjectSeen).toContain("Heads up");
    expect(admin._tables.purchases[0].suspended_at).toBeNull();
    const ev = admin._tables.abuse_events[0];
    expect(ev.action_taken).toBe("warned");
    expect(ev.event_type).toBe("unsubscribe_threshold");
  });

  test("no purchase for domain → audit row still written, no email", async () => {
    const admin = makeAdmin({ purchases: [] });
    const r = await actOnDeliverability(
      admin as unknown as Parameters<typeof actOnDeliverability>[0],
      { domain: "ex.com", evaluation: deliv() },
    );
    expect(r.acted).toBe(true);
    expect(r.emailed).toBe(false);
    expect(admin._tables.abuse_events).toHaveLength(1);
    expect(admin._tables.abuse_events[0].purchase_id).toBeNull();
  });
});
