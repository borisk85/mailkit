import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import crypto from "node:crypto";

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn(),
}));

import * as sbModule from "@/lib/supabase/server";
import { POST } from "./route";

const SECRET = "test-webhook-secret";

type PurchaseRow = {
  id: string;
  ls_order_id: string;
  status: string;
  amount_cents: number;
  currency: string;
  user_id: string | null;
  user_email: string;
  ls_order_identifier: string | null;
  custom_data: Record<string, unknown>;
  test_mode: boolean;
  refunded_at: string | null;
};

type WebhookEventRow = {
  id: string;
  source: string;
  event_name: string;
  body_hash: string;
  body: Record<string, unknown>;
  processed: boolean;
  processing_error: string | null;
};

type RefundRow = {
  id: string;
  purchase_id: string;
  amount_cents: number;
  currency: string;
  reason: string;
  triggered_by: string;
  notes: string | null;
};

/**
 * Supabase-compatible table stub with just the surface our route
 * handler calls: from().select().eq().maybeSingle(), insert().select()
 * .single(), update().eq(), upsert().
 *
 * Each table keeps an in-memory array; filters stack onto a transient
 * query state that resolves on maybeSingle / single / then (for update).
 */
function makeAdminStub(
  initial: {
    webhook_events?: WebhookEventRow[];
    purchases?: PurchaseRow[];
    refunds?: RefundRow[];
  } = {},
) {
  const tables = {
    webhook_events: [...(initial.webhook_events ?? [])],
    purchases: [...(initial.purchases ?? [])],
    refunds: [...(initial.refunds ?? [])],
  };

  function tableQuery(name: keyof typeof tables) {
    const rows = tables[name];
    const filters: Array<[string, unknown]> = [];
    let op: "select" | "insert" | "update" | "upsert" | null = null;
    let payload: unknown = null;
    let upsertOptions: {
      onConflict?: string;
      ignoreDuplicates?: boolean;
    } | null = null;

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
      upsert(
        data: unknown,
        options?: { onConflict?: string; ignoreDuplicates?: boolean },
      ) {
        op = "upsert";
        payload = data;
        upsertOptions = options ?? null;
        return { select: api.select, then: api.then, eq: api.eq };
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return api;
      },
      maybeSingle() {
        const filtered = applyFilters(rows, filters);
        return Promise.resolve({ data: filtered[0] ?? null, error: null });
      },
      single() {
        if (op === "insert") {
          const insertedRow = doInsert(rows, payload);
          return Promise.resolve({ data: insertedRow, error: null });
        }
        const filtered = applyFilters(rows, filters);
        return Promise.resolve({ data: filtered[0] ?? null, error: null });
      },
      then(resolve: (v: unknown) => unknown) {
        if (op === "update") {
          const targets = applyFilters(rows, filters);
          for (const r of targets) Object.assign(r, payload ?? {});
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "upsert") {
          const payloadRow = payload as Record<string, unknown>;
          const conflictKey = upsertOptions?.onConflict ?? "id";
          const existing = rows.find(
            (r) =>
              (r as Record<string, unknown>)[conflictKey] ===
              payloadRow[conflictKey],
          );
          if (existing) {
            if (!upsertOptions?.ignoreDuplicates) {
              Object.assign(existing, payloadRow);
            }
          } else {
            doInsert(rows, payload);
          }
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "insert") {
          doInsert(rows, payload);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "select") {
          return Promise.resolve({
            data: applyFilters(rows, filters),
            error: null,
          }).then(resolve);
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return api;
  }

  return {
    from(name: string) {
      return tableQuery(name as keyof typeof tables);
    },
    _tables: tables,
  };
}

function doInsert(
  rows: Array<Record<string, unknown>>,
  payload: unknown,
): Record<string, unknown> {
  const row = {
    id: `row-${rows.length + 1}`,
    ...(payload as Record<string, unknown>),
  };
  rows.push(row);
  return row;
}

function applyFilters(
  rows: Array<Record<string, unknown>>,
  filters: Array<[string, unknown]>,
): Array<Record<string, unknown>> {
  return rows.filter((r) => filters.every(([col, val]) => r[col] === val));
}

function sign(body: string, secret: string = SECRET): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function makeRequest(body: string, signatureHex: string | null): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (signatureHex !== null) headers.set("X-Signature", signatureHex);
  return new Request("https://mailkit.test/api/webhooks/lemon-squeezy", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.LEMONSQUEEZY_WEBHOOK_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
});

describe("POST /api/webhooks/lemon-squeezy", () => {
  test("invalid signature → 401, no DB write", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const res = await POST(makeRequest(body, "deadbeef"));

    expect(res.status).toBe(401);
    expect(admin._tables.webhook_events).toHaveLength(0);
    expect(admin._tables.purchases).toHaveLength(0);
  });

  test("missing X-Signature header → 401", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const res = await POST(makeRequest(body, null));
    expect(res.status).toBe(401);
  });

  test("missing LEMONSQUEEZY_WEBHOOK_SECRET → 500, no DB write", async () => {
    delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    const body = JSON.stringify({ meta: { event_name: "order_created" } });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(500);
    expect(admin._tables.webhook_events).toHaveLength(0);
  });

  test("order_created inserts webhook_event + purchase", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    const body = JSON.stringify({
      meta: {
        event_name: "order_created",
        custom_data: { user_id: "u-abc" },
      },
      data: {
        id: "77",
        type: "orders",
        attributes: {
          identifier: "ord-abc",
          status: "paid",
          user_email: "buyer@example.com",
          total: 500,
          currency: "USD",
          test_mode: true,
        },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(admin._tables.webhook_events).toHaveLength(1);
    expect(admin._tables.webhook_events[0].processed).toBe(true);
    expect(admin._tables.purchases).toHaveLength(1);
    const purchase = admin._tables.purchases[0];
    expect(purchase.ls_order_id).toBe("77");
    expect(purchase.user_id).toBe("u-abc");
    expect(purchase.amount_cents).toBe(500);
    expect(purchase.status).toBe("paid");
    expect(purchase.test_mode).toBe(true);
    expect(purchase.user_email).toBe("buyer@example.com");
  });

  test("duplicate body (same hash) → 200 deduplicated, no second insert", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    const body = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        id: "77",
        type: "orders",
        attributes: {
          identifier: "ord-abc",
          status: "paid",
          user_email: "buyer@example.com",
          total: 500,
          currency: "USD",
        },
      },
    });

    const r1 = await POST(makeRequest(body, sign(body)));
    expect(r1.status).toBe(200);
    expect(admin._tables.webhook_events).toHaveLength(1);
    expect(admin._tables.purchases).toHaveLength(1);

    const r2 = await POST(makeRequest(body, sign(body)));
    expect(r2.status).toBe(200);
    const j = (await r2.json()) as { deduplicated: boolean };
    expect(j.deduplicated).toBe(true);
    expect(admin._tables.webhook_events).toHaveLength(1);
    expect(admin._tables.purchases).toHaveLength(1);
  });

  test("order_created without custom_data.user_id → user_id stays null", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    const body = JSON.stringify({
      meta: { event_name: "order_created" },
      data: {
        id: "77",
        type: "orders",
        attributes: {
          user_email: "landing@example.com",
          total: 500,
          currency: "USD",
        },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(admin._tables.purchases[0].user_id).toBe(null);
  });

  test("order_refunded flips purchase to refunded + inserts audit row", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-1",
          ls_order_id: "77",
          ls_order_identifier: "ord-abc",
          status: "paid",
          amount_cents: 500,
          currency: "USD",
          user_id: "u-abc",
          user_email: "buyer@example.com",
          custom_data: {},
          test_mode: false,
          refunded_at: null,
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    const body = JSON.stringify({
      meta: { event_name: "order_refunded" },
      data: {
        id: "77",
        type: "orders",
        attributes: {
          refunded: true,
          refunded_amount: 500,
          refunded_at: "2026-04-24T12:00:00Z",
        },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(admin._tables.purchases[0].status).toBe("refunded");
    expect(admin._tables.purchases[0].refunded_at).toBe("2026-04-24T12:00:00Z");
    expect(admin._tables.refunds).toHaveLength(1);
    expect(admin._tables.refunds[0].purchase_id).toBe("p-1");
    expect(admin._tables.refunds[0].amount_cents).toBe(500);
  });

  test("order_refunded on already-refunded purchase → idempotent, no duplicate audit row", async () => {
    const admin = makeAdminStub({
      purchases: [
        {
          id: "p-1",
          ls_order_id: "77",
          ls_order_identifier: "ord-abc",
          status: "refunded",
          amount_cents: 500,
          currency: "USD",
          user_id: "u-abc",
          user_email: "buyer@example.com",
          custom_data: {},
          test_mode: false,
          refunded_at: "2026-04-24T12:00:00Z",
        },
      ],
    });
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );

    const body = JSON.stringify({
      meta: { event_name: "order_refunded" },
      data: {
        id: "77",
        type: "orders",
        attributes: { refunded: true, refunded_amount: 500 },
      },
    });

    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(admin._tables.refunds).toHaveLength(0);
  });

  test("unknown event (e.g. subscription_created) → 200, processed:true, no side effects", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    const body = JSON.stringify({
      meta: { event_name: "subscription_created" },
      data: { id: "1", type: "subscriptions", attributes: {} },
    });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(200);
    expect(admin._tables.webhook_events).toHaveLength(1);
    expect(admin._tables.webhook_events[0].processed).toBe(true);
    expect(admin._tables.purchases).toHaveLength(0);
  });

  test("missing meta.event_name → 400", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    const body = JSON.stringify({ data: { id: "1" } });
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(400);
  });

  test("invalid JSON body (but valid signature) → 400", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    const body = "not json";
    const res = await POST(makeRequest(body, sign(body)));
    expect(res.status).toBe(400);
  });
});
