import { describe, expect, test, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  formatMoney,
  getDashboardData,
  isSetupReSetupEligible,
  purchaseEffectiveStatus,
  setupOverallState,
  type SetupStatus,
} from "./dashboard-data";

describe("setupOverallState", () => {
  test.each<[SetupStatus, ReturnType<typeof setupOverallState>]>([
    ["started", "in_progress"],
    ["cf_routing_enabled", "in_progress"],
    ["cf_dns_written", "in_progress"],
    ["cf_awaiting_destination_verify", "awaiting_verification"],
    ["cf_rule_created", "in_progress"],
    ["cf_done", "in_progress"],
    ["brevo_sender_created", "in_progress"],
    ["brevo_dns_written", "awaiting_verification"],
    ["brevo_verified", "awaiting_verification"],
    ["brevo_done", "in_progress"],
    ["gmail_instructions_shown", "awaiting_verification"],
    ["gmail_smtp_ready", "awaiting_verification"],
    ["gmail_send_as_verified", "awaiting_verification"],
    ["done", "done"],
    ["failed", "failed"],
  ])("%s → %s", (status, expected) => {
    expect(setupOverallState({ status })).toBe(expected);
  });
});

describe("isSetupReSetupEligible", () => {
  test("only 'failed' is eligible", () => {
    expect(isSetupReSetupEligible({ status: "failed" })).toBe(true);
  });

  test.each<SetupStatus>([
    "started",
    "cf_done",
    "brevo_done",
    "gmail_send_as_verified",
    "done",
    "cf_awaiting_destination_verify",
  ])("%s is NOT eligible (no re-setup button)", (status) => {
    expect(isSetupReSetupEligible({ status })).toBe(false);
  });
});

describe("formatMoney", () => {
  test("USD: $-prefixed, two decimals", () => {
    expect(formatMoney(500, "USD")).toBe("$5.00");
    expect(formatMoney(1234, "USD")).toBe("$12.34");
  });

  test("non-USD: trailing currency code", () => {
    expect(formatMoney(500, "EUR")).toBe("5.00 EUR");
    expect(formatMoney(1000, "GBP")).toBe("10.00 GBP");
  });

  test("lowercase currency normalized to uppercase", () => {
    expect(formatMoney(500, "usd")).toBe("$5.00");
    expect(formatMoney(500, "eur")).toBe("5.00 EUR");
  });

  test("empty currency defaults to USD", () => {
    expect(formatMoney(500, "")).toBe("$5.00");
  });

  test("zero amount", () => {
    expect(formatMoney(0, "USD")).toBe("$0.00");
  });
});

describe("purchaseEffectiveStatus", () => {
  const purchase = { id: "p1", status: "paid" as const };

  test("paid + no refund rows → paid", () => {
    expect(purchaseEffectiveStatus(purchase, [])).toBe("paid");
  });

  test("paid + matching refund row → refunded", () => {
    expect(
      purchaseEffectiveStatus(purchase, [
        { purchaseId: "p1", amountCents: 500 },
      ]),
    ).toBe("refunded");
  });

  test("paid + zero-amount refund row (LS_CALL_FAILED audit marker) → paid", () => {
    // Auto-refund failure path writes amount=0 audit row to leave a
    // forensic trail without claiming the refund happened.
    expect(
      purchaseEffectiveStatus(purchase, [{ purchaseId: "p1", amountCents: 0 }]),
    ).toBe("paid");
  });

  test("refund row for different purchase → ignored", () => {
    expect(
      purchaseEffectiveStatus(purchase, [
        { purchaseId: "p2", amountCents: 500 },
      ]),
    ).toBe("paid");
  });

  test("already refunded column wins (no recompute)", () => {
    expect(
      purchaseEffectiveStatus({ id: "p1", status: "refunded" }, [
        { purchaseId: "p1", amountCents: 500 },
      ]),
    ).toBe("refunded");
  });

  test("partially_refunded column passes through unchanged", () => {
    expect(
      purchaseEffectiveStatus({ id: "p1", status: "partially_refunded" }, [
        { purchaseId: "p1", amountCents: 250 },
      ]),
    ).toBe("partially_refunded");
  });

  test("fraudulent column passes through unchanged", () => {
    expect(
      purchaseEffectiveStatus({ id: "p1", status: "fraudulent" }, []),
    ).toBe("fraudulent");
  });
});

describe("getDashboardData", () => {
  function makeSupabaseStub(init: {
    setups?: unknown[];
    purchases?: unknown[];
    refunds?: unknown[];
  }) {
    const calls: Array<{ table: string; userId?: string }> = [];
    return {
      from(table: string) {
        const filters: Array<[string, unknown]> = [];
        const api = {
          select() {
            return api;
          },
          eq(col: string, val: unknown) {
            filters.push([col, val]);
            return api;
          },
          order() {
            return api;
          },
          then(resolve: (v: unknown) => unknown) {
            const userIdFilter = filters.find(([c]) => c === "user_id");
            calls.push({
              table,
              userId: userIdFilter?.[1] as string | undefined,
            });
            const data =
              table === "setup_runs"
                ? init.setups
                : table === "purchases"
                  ? init.purchases
                  : init.refunds;
            return Promise.resolve({ data: data ?? [], error: null }).then(
              resolve,
            );
          },
        };
        return api;
      },
      _calls: calls,
    };
  }

  test("happy path: maps snake_case rows to camelCase shape", async () => {
    const supabase = makeSupabaseStub({
      setups: [
        {
          id: "s1",
          domain: "ex.com",
          mailbox_local: "hello",
          status: "done",
          error_msg: null,
          created_at: "2026-04-26T10:00:00Z",
          updated_at: "2026-04-26T11:00:00Z",
        },
      ],
      purchases: [
        {
          id: "p1",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          ls_order_id: "8171995",
          ls_order_identifier: "ord-uuid",
          custom_data: { domain: "ex.com" },
          test_mode: true,
          created_at: "2026-04-26T10:30:00Z",
          refunded_at: null,
          suspended_at: null,
          suspension_reason: null,
        },
      ],
      refunds: [
        {
          id: "r1",
          purchase_id: "p1",
          amount_cents: 500,
          currency: "USD",
          reason: "automation_failure",
          triggered_by: "system",
          notes: "Auto-refund triggered by failed_step=brevo_verify",
          created_at: "2026-04-26T11:00:00Z",
        },
      ],
    });

    const out = await getDashboardData(
      supabase as unknown as Parameters<typeof getDashboardData>[0],
      "user-1",
    );

    expect(out.setups).toEqual([
      {
        id: "s1",
        domain: "ex.com",
        mailboxLocal: "hello",
        status: "done",
        errorMsg: null,
        createdAt: "2026-04-26T10:00:00Z",
        updatedAt: "2026-04-26T11:00:00Z",
      },
    ]);
    expect(out.purchases[0]).toMatchObject({
      id: "p1",
      amountCents: 500,
      lsOrderId: "8171995",
      lsOrderIdentifier: "ord-uuid",
      domain: "ex.com",
      testMode: true,
    });
    expect(out.refunds[0].triggeredBy).toBe("system");
  });

  test("user_id is forwarded as the eq filter on each table read", async () => {
    const supabase = makeSupabaseStub({});
    await getDashboardData(
      supabase as unknown as Parameters<typeof getDashboardData>[0],
      "user-abc",
    );
    expect(supabase._calls).toContainEqual({
      table: "setup_runs",
      userId: "user-abc",
    });
    expect(supabase._calls).toContainEqual({
      table: "purchases",
      userId: "user-abc",
    });
    // refunds doesn't filter by user_id directly — relies on the
    // FK to purchases + RLS-on-purchases to scope.
    expect(supabase._calls).toContainEqual({
      table: "refunds",
      userId: undefined,
    });
  });

  test("custom_data.domain missing → DashboardPurchase.domain is null", async () => {
    const supabase = makeSupabaseStub({
      purchases: [
        {
          id: "p1",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          ls_order_id: "1",
          ls_order_identifier: null,
          custom_data: {},
          test_mode: false,
          created_at: "2026-04-26T10:30:00Z",
          refunded_at: null,
          suspended_at: null,
          suspension_reason: null,
        },
      ],
    });
    const out = await getDashboardData(
      supabase as unknown as Parameters<typeof getDashboardData>[0],
      "u",
    );
    expect(out.purchases[0].domain).toBeNull();
  });

  test("empty user (no rows in any table) → empty arrays, no errors", async () => {
    const supabase = makeSupabaseStub({});
    const out = await getDashboardData(
      supabase as unknown as Parameters<typeof getDashboardData>[0],
      "first-time-user",
    );
    expect(out.setups).toEqual([]);
    expect(out.purchases).toEqual([]);
    expect(out.refunds).toEqual([]);
  });

  test("custom_data NULL (older rows pre-#7) → domain null without throwing", async () => {
    const supabase = makeSupabaseStub({
      purchases: [
        {
          id: "p-old",
          amount_cents: 500,
          currency: "USD",
          status: "paid",
          ls_order_id: "1",
          ls_order_identifier: null,
          custom_data: null,
          test_mode: false,
          created_at: "2026-04-01T10:00:00Z",
          refunded_at: null,
          suspended_at: null,
          suspension_reason: null,
        },
      ],
    });
    const out = await getDashboardData(
      supabase as unknown as Parameters<typeof getDashboardData>[0],
      "u",
    );
    expect(out.purchases[0].domain).toBeNull();
  });
});
