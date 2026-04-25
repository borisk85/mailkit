import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { linkOrphanPurchase } from "./checkout-link";

type PurchaseRow = {
  id: string;
  user_id: string | null;
  user_email: string;
  ls_order_identifier: string | null;
  status: string;
  created_at: string;
};

function makeAdmin(init: { purchases?: PurchaseRow[] }) {
  const tables = {
    purchases: [...(init.purchases ?? [])],
  };

  function query(name: keyof typeof tables) {
    const rows = tables[name];
    const filters: Array<[string, unknown]> = [];
    const isFilters: Array<[string, unknown]> = [];
    let op: "select" | "update" | null = null;
    let payload: unknown = null;
    let order: { col: string; ascending: boolean } | undefined;
    let limitN: number | undefined;

    const api: Record<string, unknown> = {
      select() {
        if (!op) op = "select";
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
      order(col: string, opts: { ascending: boolean }) {
        order = { col, ascending: opts.ascending };
        return api;
      },
      limit(n: number) {
        limitN = n;
        return api;
      },
      maybeSingle() {
        const out = applyAll(
          rows as unknown as Record<string, unknown>[],
          filters,
          isFilters,
        );
        return Promise.resolve({ data: out[0] ?? null, error: null });
      },
      then(resolve: (v: unknown) => unknown) {
        if (op === "update") {
          const targets = applyAll(
            rows as unknown as Record<string, unknown>[],
            filters,
            isFilters,
          );
          for (const r of targets)
            Object.assign(r, payload as Record<string, unknown>);
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
        if (op === "select") {
          let out = applyAll(
            rows as unknown as Record<string, unknown>[],
            filters,
            isFilters,
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

function applyAll(
  rows: Record<string, unknown>[],
  eqFilters: Array<[string, unknown]>,
  isFilters: Array<[string, unknown]>,
): Record<string, unknown>[] {
  return rows.filter((r) => {
    for (const [c, v] of eqFilters) if (r[c] !== v) return false;
    for (const [c, v] of isFilters) if (r[c] !== v) return false;
    return true;
  });
}

function iso(msAgo: number): string {
  return new Date(Date.now() - msAgo).toISOString();
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("linkOrphanPurchase", () => {
  test("empty user email → no-op {linked: false}", async () => {
    const admin = makeAdmin({});
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "u1",
      userEmail: "",
    });
    expect(r.linked).toBe(false);
  });

  test("no orphan purchase matches email → {linked: false}", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p1",
          user_id: null,
          user_email: "other@example.com",
          ls_order_identifier: null,
          status: "paid",
          created_at: iso(60_000),
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "u1",
      userEmail: "buyer@example.com",
    });
    expect(r.linked).toBe(false);
    expect(admin._tables.purchases[0].user_id).toBeNull();
  });

  test("recent orphan with matching email → linked", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p1",
          user_id: null,
          user_email: "buyer@example.com",
          ls_order_identifier: null,
          status: "paid",
          created_at: iso(5 * 60_000), // 5 min ago
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "user-abc",
      userEmail: "buyer@example.com",
    });
    expect(r.linked).toBe(true);
    expect(r.purchaseId).toBe("p1");
    expect(admin._tables.purchases[0].user_id).toBe("user-abc");
  });

  test("orphan outside recency window (> 1h) → not linked", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p1",
          user_id: null,
          user_email: "buyer@example.com",
          ls_order_identifier: null,
          status: "paid",
          created_at: iso(2 * 60 * 60_000), // 2 hours ago
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "user-abc",
      userEmail: "buyer@example.com",
    });
    expect(r.linked).toBe(false);
    expect(admin._tables.purchases[0].user_id).toBeNull();
  });

  test("email match is case-insensitive", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p1",
          user_id: null,
          user_email: "Buyer@EXAMPLE.com",
          ls_order_identifier: null,
          status: "paid",
          created_at: iso(60_000),
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "user-abc",
      userEmail: "buyer@example.com",
    });
    expect(r.linked).toBe(true);
    expect(admin._tables.purchases[0].user_id).toBe("user-abc");
  });

  test("purchase already linked (user_id set) → not touched", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p1",
          user_id: "prior-user",
          user_email: "buyer@example.com",
          ls_order_identifier: null,
          status: "paid",
          created_at: iso(60_000),
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "user-abc",
      userEmail: "buyer@example.com",
    });
    expect(r.linked).toBe(false);
    expect(admin._tables.purchases[0].user_id).toBe("prior-user");
  });

  test("most recent candidate wins when multiple orphans", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p-old",
          user_id: null,
          user_email: "buyer@example.com",
          ls_order_identifier: null,
          status: "paid",
          created_at: iso(30 * 60_000),
        },
        {
          id: "p-new",
          user_id: null,
          user_email: "buyer@example.com",
          ls_order_identifier: null,
          status: "paid",
          created_at: iso(2 * 60_000),
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "user-abc",
      userEmail: "buyer@example.com",
    });
    expect(r.linked).toBe(true);
    expect(r.purchaseId).toBe("p-new");
    expect(
      admin._tables.purchases.find((p) => p.id === "p-old")!.user_id,
    ).toBeNull();
    expect(admin._tables.purchases.find((p) => p.id === "p-new")!.user_id).toBe(
      "user-abc",
    );
  });

  test("lsOrderIdentifier exact match bypasses recency window", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p-exact",
          user_id: null,
          user_email: "buyer@example.com",
          ls_order_identifier: "ord-77",
          status: "paid",
          // 5 hours ago — would fail the recency fallback, but
          // identifier match should succeed regardless.
          created_at: iso(5 * 60 * 60_000),
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "user-abc",
      userEmail: "buyer@example.com",
      lsOrderIdentifier: "ord-77",
    });
    expect(r.linked).toBe(true);
    expect(r.purchaseId).toBe("p-exact");
  });

  test("lsOrderIdentifier match with wrong email → not linked (safety)", async () => {
    const admin = makeAdmin({
      purchases: [
        {
          id: "p-exact",
          user_id: null,
          user_email: "stranger@example.com",
          ls_order_identifier: "ord-77",
          status: "paid",
          created_at: iso(10 * 60_000),
        },
      ],
    });
    const r = await linkOrphanPurchase({
      admin: admin as unknown as Parameters<
        typeof linkOrphanPurchase
      >[0]["admin"],
      userId: "user-abc",
      userEmail: "buyer@example.com",
      lsOrderIdentifier: "ord-77",
    });
    expect(r.linked).toBe(false);
    expect(admin._tables.purchases[0].user_id).toBeNull();
  });
});
