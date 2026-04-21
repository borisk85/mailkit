import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock CF client + supabase server helpers before importing the action.
vi.mock("@/lib/integrations/cloudflare", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/integrations/cloudflare")
  >("@/lib/integrations/cloudflare");
  return {
    ...actual,
    createCloudflareClient: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { CloudflareError } from "@/lib/integrations/cloudflare";
import * as cfModule from "@/lib/integrations/cloudflare";
import * as sbModule from "@/lib/supabase/server";
import {
  resumeDestinationVerify,
  startSetupRun,
  verifyCloudflareToken,
} from "./actions";

type MockRow = {
  id: string;
  user_id: string;
  domain: string;
  mailbox_local: string;
  status: string;
  cf_zone_id: string | null;
  cf_state: Record<string, unknown>;
  error_msg: string | null;
  created_at: string;
};

function makeAdminStub(initialRows: MockRow[] = []) {
  const rows: MockRow[] = [...initialRows];
  const updateCalls: Array<{ id: string; patch: Record<string, unknown> }> = [];

  const client = {
    rows,
    updateCalls,
    from() {
      return buildQuery(rows, updateCalls);
    },
  };

  return client;
}

function buildQuery(
  rows: MockRow[],
  updateCalls: Array<{ id: string; patch: Record<string, unknown> }>,
) {
  const state: {
    op: "select" | "insert" | "update" | null;
    selectCols?: string;
    filters: Array<[string, string, unknown]>;
    notFilters: Array<[string, string, unknown]>;
    payload?: Record<string, unknown>;
    insertPayload?: Record<string, unknown>;
    order?: { col: string; ascending: boolean };
    limit?: number;
  } = {
    op: null,
    filters: [],
    notFilters: [],
  };

  const api: Record<string, unknown> = {
    select(cols?: string) {
      if (!state.op) state.op = "select";
      state.selectCols = cols;
      return api;
    },
    insert(payload: Record<string, unknown>) {
      state.op = "insert";
      state.insertPayload = payload;
      return api;
    },
    update(patch: Record<string, unknown>) {
      state.op = "update";
      state.payload = patch;
      return api;
    },
    eq(col: string, val: unknown) {
      state.filters.push([col, "eq", val]);
      return api;
    },
    not(col: string, op: string, val: unknown) {
      state.notFilters.push([col, op, val]);
      return api;
    },
    order(col: string, opts: { ascending: boolean }) {
      state.order = { col, ascending: opts.ascending };
      return api;
    },
    limit(n: number) {
      state.limit = n;
      return api;
    },
    maybeSingle() {
      const filtered = applyFilters(rows, state);
      return Promise.resolve({ data: filtered[0] ?? null, error: null });
    },
    single() {
      if (state.op === "insert" && state.insertPayload) {
        const newRow: MockRow = {
          id: `run-${rows.length + 1}`,
          user_id: String(state.insertPayload.user_id ?? ""),
          domain: String(state.insertPayload.domain ?? ""),
          mailbox_local: String(state.insertPayload.mailbox_local ?? ""),
          status: String(state.insertPayload.status ?? "started"),
          cf_zone_id: (state.insertPayload.cf_zone_id as string | null) ?? null,
          cf_state:
            (state.insertPayload.cf_state as Record<string, unknown>) ?? {},
          error_msg: null,
          created_at: new Date().toISOString(),
        };
        rows.push(newRow);
        return Promise.resolve({ data: { id: newRow.id }, error: null });
      }
      const filtered = applyFilters(rows, state);
      return Promise.resolve({ data: filtered[0] ?? null, error: null });
    },
    then(resolve: (v: unknown) => unknown) {
      if (state.op === "update") {
        const targeted = applyFilters(rows, state);
        for (const r of targeted) {
          updateCalls.push({ id: r.id, patch: { ...(state.payload ?? {}) } });
          Object.assign(r, state.payload ?? {});
        }
        return Promise.resolve({ data: null, error: null }).then(resolve);
      }
      if (state.op === "select") {
        const filtered = applyFilters(rows, state);
        return Promise.resolve({ data: filtered, error: null }).then(resolve);
      }
      return Promise.resolve({ data: null, error: null }).then(resolve);
    },
  };
  return api;
}

function applyFilters(
  rows: MockRow[],
  state: {
    filters: Array<[string, string, unknown]>;
    notFilters: Array<[string, string, unknown]>;
  },
): MockRow[] {
  return rows.filter((r) => {
    for (const [col, , val] of state.filters) {
      if ((r as unknown as Record<string, unknown>)[col] !== val) return false;
    }
    for (const [col, op, val] of state.notFilters) {
      if (op === "in") {
        const listStr = String(val).replace(/^\(|\)$/g, "");
        const list = listStr.split(",").map((s) => s.trim());
        if (
          list.includes(String((r as unknown as Record<string, unknown>)[col]))
        )
          return false;
      }
    }
    return true;
  });
}

function makeAnonStubWithUser(
  user: { id: string; email: string | null } | null,
) {
  return {
    auth: { getUser: () => Promise.resolve({ data: { user }, error: null }) },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("verifyCloudflareToken", () => {
  test("returns zones stripped to id/name/accountId", async () => {
    const sb = makeAnonStubWithUser({ id: "u1", email: "me@g.com" });
    vi.mocked(sbModule.createClient).mockResolvedValue(
      sb as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const listZones = vi
      .fn()
      .mockResolvedValue([
        {
          id: "z1",
          name: "ex.com",
          status: "active",
          account: { id: "acc1", name: "A" },
        },
      ]);
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue({
      listZones,
    } as unknown as ReturnType<typeof cfModule.createCloudflareClient>);

    const result = await verifyCloudflareToken({
      token: "tok_longer_than_20_chars",
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.zones).toEqual([
        { id: "z1", name: "ex.com", accountId: "acc1" },
      ]);
    }
    expect(listZones).toHaveBeenCalledOnce();
  });

  test("invalid token (CF code 10000) → invalid_token errorKey", async () => {
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue({
      listZones: vi.fn().mockRejectedValue(
        new CloudflareError({
          message: "Invalid API token",
          code: 10000,
          httpStatus: 401,
        }),
      ),
    } as unknown as ReturnType<typeof cfModule.createCloudflareClient>);

    const result = await verifyCloudflareToken({
      token: "tok_longer_than_20_chars",
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.invalid_token");
    }
  });

  test("unauthenticated → not_authenticated errorKey", async () => {
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser(null) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
    const result = await verifyCloudflareToken({
      token: "tok_longer_than_20_chars",
    });
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.not_authenticated");
    }
  });
});

describe("startSetupRun — happy path", () => {
  test("runs every CF step in order and ends at cf_done", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );

    const callOrder: string[] = [];
    const cf = {
      listZones: vi.fn(async () => {
        callOrder.push("listZones");
        return [
          {
            id: "z1",
            name: "ex.com",
            status: "active",
            account: { id: "acc1", name: "A" },
          },
        ];
      }),
      enableEmailRouting: vi.fn(async () => {
        callOrder.push("enableEmailRouting");
        return { status: { enabled: true, status: "ready" }, skipped: false };
      }),
      listDnsRecords: vi.fn(async () => {
        callOrder.push("listDnsRecords");
        return [];
      }),
      createDnsRecord: vi.fn(
        async (
          _: string,
          rec: { type: string; name: string; content: string },
        ) => {
          callOrder.push(
            `createDnsRecord:${rec.type}:${rec.content.slice(0, 20)}`,
          );
          return { id: `rec-${callOrder.length}`, ...rec, ttl: 1 };
        },
      ),
      updateDnsRecord: vi.fn(),
      listEmailRoutingDestinations: vi.fn(async () => {
        callOrder.push("listEmailRoutingDestinations");
        return [{ email: "me@g.com", verified: "2026-04-20T00:00:00Z" }];
      }),
      createEmailRoutingDestination: vi.fn(),
      listEmailRoutingRules: vi.fn(async () => {
        callOrder.push("listEmailRoutingRules");
        return [];
      }),
      createEmailRoutingRule: vi.fn(async () => {
        callOrder.push("createEmailRoutingRule");
        return {
          id: "r1",
          enabled: true,
          matchers: [{ type: "literal", field: "to", value: "hello@ex.com" }],
          actions: [{ type: "forward", value: ["me@g.com"] }],
        };
      }),
      getEmailRoutingStatus: vi.fn(),
    };
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );

    const result = await startSetupRun({
      token: "tok_longer_than_20_chars",
      zoneId: "z1",
      mailboxLocal: "hello",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.runStatus).toBe("cf_done");
      expect(result.destinationEmail).toBe("me@g.com");
    }

    // Order: list zones → enable routing → DNS (5 times) → destinations → rules → create rule
    const enableIdx = callOrder.indexOf("enableEmailRouting");
    const listDestIdx = callOrder.indexOf("listEmailRoutingDestinations");
    const listRulesIdx = callOrder.indexOf("listEmailRoutingRules");
    const createRuleIdx = callOrder.indexOf("createEmailRoutingRule");
    expect(enableIdx).toBeLessThan(listDestIdx);
    expect(listDestIdx).toBeLessThan(listRulesIdx);
    expect(listRulesIdx).toBeLessThan(createRuleIdx);

    // DNS: 3 MX + 1 SPF + 1 DMARC → 5 creates
    const createDnsCount = callOrder.filter((c) =>
      c.startsWith("createDnsRecord:"),
    ).length;
    expect(createDnsCount).toBe(5);

    const row = admin.rows[0];
    expect(row.status).toBe("cf_done");
    expect(row.cf_state.account_id).toBe("acc1");
    expect((row.cf_state.dns as Record<string, string>).spf).toBeTypeOf(
      "string",
    );
    expect(row.cf_state.rule_id).toBe("r1");
  });
});

describe("startSetupRun — fail mid-flow", () => {
  test("DNS create throws → row.status=failed, error_msg + last_step set", async () => {
    const admin = makeAdminStub();
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );

    const cf = {
      listZones: vi
        .fn()
        .mockResolvedValue([
          {
            id: "z1",
            name: "ex.com",
            status: "active",
            account: { id: "acc1", name: "A" },
          },
        ]),
      enableEmailRouting: vi
        .fn()
        .mockResolvedValue({
          status: { enabled: true, status: "ready" },
          skipped: false,
        }),
      listDnsRecords: vi.fn().mockResolvedValue([]),
      createDnsRecord: vi.fn().mockRejectedValue(
        new CloudflareError({
          message: "DNS record rejected",
          code: 1001,
          httpStatus: 400,
        }),
      ),
      updateDnsRecord: vi.fn(),
      listEmailRoutingDestinations: vi.fn(),
      createEmailRoutingDestination: vi.fn(),
      listEmailRoutingRules: vi.fn(),
      createEmailRoutingRule: vi.fn(),
      getEmailRoutingStatus: vi.fn(),
    };
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );

    const result = await startSetupRun({
      token: "tok_longer_than_20_chars",
      zoneId: "z1",
      mailboxLocal: "hello",
    });

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.dns_rejected");
    }

    const row = admin.rows[0];
    expect(row.status).toBe("failed");
    expect(row.error_msg).toContain("1001");
    expect(row.cf_state.last_step).toBe("dns_upsert");
  });
});

describe("resumeDestinationVerify", () => {
  test("destination still unverified → stays in awaiting state", async () => {
    const admin = makeAdminStub([
      {
        id: "11111111-2222-4333-8444-555555555555",
        user_id: "u1",
        domain: "ex.com",
        mailbox_local: "hello",
        status: "cf_awaiting_destination_verify",
        cf_zone_id: "z1",
        cf_state: {
          account_id: "acc1",
          destination_email: "me@g.com",
          last_step: "create_destination",
        },
        error_msg: null,
        created_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue({
      listEmailRoutingDestinations: vi
        .fn()
        .mockResolvedValue([{ email: "me@g.com", verified: null }]),
    } as unknown as ReturnType<typeof cfModule.createCloudflareClient>);

    const result = await resumeDestinationVerify({
      runId: "11111111-2222-4333-8444-555555555555",
      token: "tok_longer_than_20_chars",
    });

    if (result.status === "error") {
      throw new Error(`unexpected error key: ${result.errorKey}`);
    }
    expect(result.runStatus).toBe("cf_awaiting_destination_verify");
  });

  test("destination verified → finalizes rule and returns cf_done", async () => {
    const admin = makeAdminStub([
      {
        id: "11111111-2222-4333-8444-555555555555",
        user_id: "u1",
        domain: "ex.com",
        mailbox_local: "hello",
        status: "cf_awaiting_destination_verify",
        cf_zone_id: "z1",
        cf_state: {
          account_id: "acc1",
          destination_email: "me@g.com",
          last_step: "create_destination",
        },
        error_msg: null,
        created_at: new Date().toISOString(),
      },
    ]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue({
      listEmailRoutingDestinations: vi
        .fn()
        .mockResolvedValue([
          { email: "me@g.com", verified: "2026-04-21T00:00:00Z" },
        ]),
      listEmailRoutingRules: vi.fn().mockResolvedValue([]),
      createEmailRoutingRule: vi.fn().mockResolvedValue({
        id: "r1",
        enabled: true,
        matchers: [{ type: "literal", field: "to", value: "hello@ex.com" }],
        actions: [{ type: "forward", value: ["me@g.com"] }],
      }),
    } as unknown as ReturnType<typeof cfModule.createCloudflareClient>);

    const result = await resumeDestinationVerify({
      runId: "11111111-2222-4333-8444-555555555555",
      token: "tok_longer_than_20_chars",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.runStatus).toBe("cf_done");
    }
    expect(admin.rows[0].status).toBe("cf_done");
    expect(admin.rows[0].cf_state.rule_id).toBe("r1");
  });
});
