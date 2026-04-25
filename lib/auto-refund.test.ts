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

import { triggerAutoRefund } from "./auto-refund";

const LS_BASE = "https://api.lemonsqueezy.com/v1";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type RunRow = { id: string; user_id: string | null };
type PurchaseRow = {
  id: string;
  user_id: string;
  ls_order_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  refunded_at: string | null;
  created_at: string;
};
type RefundRow = {
  id: string;
  purchase_id: string;
  run_id: string | null;
  amount_cents: number;
  currency: string;
  reason: string;
  triggered_by: string;
  notes: string | null;
};

function makeAdmin(init: {
  setup_runs?: RunRow[];
  purchases?: PurchaseRow[];
  refunds?: RefundRow[];
}) {
  const tables = {
    setup_runs: [...(init.setup_runs ?? [])],
    purchases: [...(init.purchases ?? [])],
    refunds: [...(init.refunds ?? [])],
  };

  function query(name: keyof typeof tables) {
    const rows = tables[name];
    const filters: Array<[string, unknown]> = [];
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
      order(col: string, opts: { ascending: boolean }) {
        order = { col, ascending: opts.ascending };
        return api;
      },
      limit(n: number) {
        limitN = n;
        return api;
      },
      maybeSingle() {
        const filtered = applyFilters(
          rows as unknown as Record<string, unknown>[],
          filters,
        );
        return Promise.resolve({ data: filtered[0] ?? null, error: null });
      },
      then(resolve: (v: unknown) => unknown) {
        if (op === "update") {
          const targets = applyFilters(
            rows as unknown as Record<string, unknown>[],
            filters,
          );
          for (const r of targets)
            Object.assign(r, payload as Record<string, unknown>);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "insert") {
          const row = {
            id: `row-${rows.length + 1}`,
            ...(payload as Record<string, unknown>),
          };
          (rows as Record<string, unknown>[]).push(row);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "select") {
          let out = applyFilters(
            rows as unknown as Record<string, unknown>[],
            filters,
          );
          if (order) {
            out = [...out].sort((a, b) => {
              const av = (a as Record<string, unknown>)[order!.col] as string;
              const bv = (b as Record<string, unknown>)[order!.col] as string;
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

function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: Array<[string, unknown]>,
): T[] {
  return rows.filter((r) => filters.every(([c, v]) => r[c] === v));
}

function stubTimers() {
  return vi.spyOn(global, "setTimeout").mockImplementation(((
    cb: () => void,
  ) => {
    cb();
    return 0 as unknown as NodeJS.Timeout;
  }) as typeof setTimeout);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.LEMONSQUEEZY_API_KEY = "test-ls-key";
});

afterEach(() => {
  delete process.env.LEMONSQUEEZY_API_KEY;
});

describe("triggerAutoRefund", () => {
  test("non-auto step (gmail_prepare) → no LS call, no writes", async () => {
    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: "u1" }],
      purchases: [
        {
          id: "p1",
          user_id: "u1",
          ls_order_id: "77",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          refunded_at: null,
          created_at: "2026-04-24T10:00:00Z",
        },
      ],
    });
    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "gmail_prepare",
    );
    expect(admin._tables.purchases[0].status).toBe("paid");
    expect(admin._tables.refunds).toHaveLength(0);
  });

  test("missing LEMONSQUEEZY_API_KEY → no-op (logs + returns)", async () => {
    delete process.env.LEMONSQUEEZY_API_KEY;
    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: "u1" }],
      purchases: [
        {
          id: "p1",
          user_id: "u1",
          ls_order_id: "77",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          refunded_at: null,
          created_at: "2026-04-24T10:00:00Z",
        },
      ],
    });
    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "enable_routing",
    );
    expect(admin._tables.purchases[0].status).toBe("paid");
    expect(admin._tables.refunds).toHaveLength(0);
  });

  test("no purchase for user → log + return, no LS call", async () => {
    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: "u1" }],
      purchases: [],
    });
    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "enable_routing",
    );
    expect(admin._tables.refunds).toHaveLength(0);
  });

  test("run missing user_id → log + return", async () => {
    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: null }],
      purchases: [],
    });
    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "enable_routing",
    );
    expect(admin._tables.refunds).toHaveLength(0);
  });

  test("happy path: enable_routing fail → LS refund + purchase flipped + refunds row", async () => {
    server.use(
      http.post(`${LS_BASE}/orders/77/refund`, () =>
        HttpResponse.json({
          data: {
            type: "orders",
            id: "77",
            attributes: {
              status: "refunded",
              refunded: true,
              refunded_amount: 500,
              refunded_at: "2026-04-24T12:00:00Z",
              total: 500,
              currency: "USD",
            },
          },
        }),
      ),
    );

    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: "u1" }],
      purchases: [
        {
          id: "p1",
          user_id: "u1",
          ls_order_id: "77",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          refunded_at: null,
          created_at: "2026-04-24T10:00:00Z",
        },
      ],
    });

    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "enable_routing",
    );

    expect(admin._tables.purchases[0].status).toBe("refunded");
    expect(admin._tables.purchases[0].refunded_at).toBe("2026-04-24T12:00:00Z");
    expect(admin._tables.refunds).toHaveLength(1);
    const refund = admin._tables.refunds[0];
    expect(refund.purchase_id).toBe("p1");
    expect(refund.run_id).toBe("r1");
    expect(refund.amount_cents).toBe(500);
    expect(refund.reason).toBe("automation_failure");
    expect(refund.triggered_by).toBe("system");
    expect(refund.notes).toContain("enable_routing");
  });

  test("most-recent paid purchase picked (multi-purchase user)", async () => {
    server.use(
      http.post(`${LS_BASE}/orders/99/refund`, () =>
        HttpResponse.json({
          data: {
            type: "orders",
            id: "99",
            attributes: {
              status: "refunded",
              refunded: true,
              refunded_amount: 500,
              refunded_at: "2026-04-24T12:00:00Z",
              total: 500,
              currency: "USD",
            },
          },
        }),
      ),
    );

    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: "u1" }],
      purchases: [
        {
          id: "p-old",
          user_id: "u1",
          ls_order_id: "77",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          refunded_at: null,
          created_at: "2026-03-01T10:00:00Z",
        },
        {
          id: "p-new",
          user_id: "u1",
          ls_order_id: "99",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          refunded_at: null,
          created_at: "2026-04-24T10:00:00Z",
        },
      ],
    });

    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "brevo_verify",
    );

    const newP = admin._tables.purchases.find((p) => p.id === "p-new")!;
    const oldP = admin._tables.purchases.find((p) => p.id === "p-old")!;
    expect(newP.status).toBe("refunded");
    expect(oldP.status).toBe("paid");
    expect(admin._tables.refunds).toHaveLength(1);
    expect(admin._tables.refunds[0].purchase_id).toBe("p-new");
  });

  test("LS call fails → refunds row with LS_CALL_FAILED note, purchase stays paid", async () => {
    server.use(
      http.post(`${LS_BASE}/orders/77/refund`, () =>
        HttpResponse.json(
          {
            errors: [
              {
                title: "Forbidden",
                detail: "Insufficient permissions",
                code: "forbidden",
              },
            ],
          },
          { status: 403 },
        ),
      ),
    );

    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: "u1" }],
      purchases: [
        {
          id: "p1",
          user_id: "u1",
          ls_order_id: "77",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          refunded_at: null,
          created_at: "2026-04-24T10:00:00Z",
        },
      ],
    });

    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "dns_upsert",
    );

    // Purchase stays paid — support can retry.
    expect(admin._tables.purchases[0].status).toBe("paid");
    // Audit row is written with the LS_CALL_FAILED marker so support
    // can grep for these in the refunds table.
    expect(admin._tables.refunds).toHaveLength(1);
    const r = admin._tables.refunds[0];
    expect(r.triggered_by).toBe("system");
    expect(r.amount_cents).toBe(0);
    expect(r.notes).toContain("LS_CALL_FAILED");
    expect(r.notes).toContain("forbidden");
    expect(r.notes).toContain("dns_upsert");
  });

  test("LS retriable (5xx) then succeeds — same flow as happy path", async () => {
    let attempts = 0;
    server.use(
      http.post(`${LS_BASE}/orders/77/refund`, () => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { errors: [{ title: "Gateway", code: "bad_gateway" }] },
            { status: 502 },
          );
        }
        return HttpResponse.json({
          data: {
            type: "orders",
            id: "77",
            attributes: {
              status: "refunded",
              refunded: true,
              refunded_amount: 500,
              refunded_at: "2026-04-24T12:00:00Z",
              total: 500,
              currency: "USD",
            },
          },
        });
      }),
    );

    const admin = makeAdmin({
      setup_runs: [{ id: "r1", user_id: "u1" }],
      purchases: [
        {
          id: "p1",
          user_id: "u1",
          ls_order_id: "77",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          refunded_at: null,
          created_at: "2026-04-24T10:00:00Z",
        },
      ],
    });

    const timeoutSpy = stubTimers();
    await triggerAutoRefund(
      admin as unknown as Parameters<typeof triggerAutoRefund>[0],
      "r1",
      "brevo_dns_upsert",
    );
    timeoutSpy.mockRestore();

    expect(attempts).toBe(2);
    expect(admin._tables.purchases[0].status).toBe("refunded");
    expect(admin._tables.refunds).toHaveLength(1);
    expect(admin._tables.refunds[0].notes).not.toContain("LS_CALL_FAILED");
  });
});
