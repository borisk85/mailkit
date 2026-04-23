import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

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

vi.mock("@/lib/integrations/brevo", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/integrations/brevo")
  >("@/lib/integrations/brevo");
  return { ...actual, createBrevoClient: vi.fn() };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

import { CloudflareError } from "@/lib/integrations/cloudflare";
import * as cfModule from "@/lib/integrations/cloudflare";
import * as brevoModule from "@/lib/integrations/brevo";
import * as sbModule from "@/lib/supabase/server";
import {
  confirmGmailSendAs,
  continueBrevoSetup,
  prepareGmailStep,
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
  gmail_state?: Record<string, unknown>;
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
    const listZones = vi.fn().mockResolvedValue([
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

    // DNS: 1 SPF + 1 DMARC → 2 creates (MX is managed by CF Email Routing).
    const createDnsCount = callOrder.filter((c) =>
      c.startsWith("createDnsRecord:"),
    ).length;
    expect(createDnsCount).toBe(2);

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
      listZones: vi.fn().mockResolvedValue([
        {
          id: "z1",
          name: "ex.com",
          status: "active",
          account: { id: "acc1", name: "A" },
        },
      ]),
      enableEmailRouting: vi.fn().mockResolvedValue({
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

/* ------------------------------------------------------------------ *
 * Ticket #4b — continueBrevoSetup tests
 * ------------------------------------------------------------------ */

import { BrevoError } from "@/lib/integrations/brevo";

const BREVO_RUN_ID = "22222222-3333-4444-8555-666666666666";

function makeCfForBrevo() {
  // Minimal CF stub: listDnsRecords returns current SPF, createDnsRecord
  // stamps ids. upsertDnsByPattern uses list+create/update internally.
  const listDnsRecords = vi.fn(
    async (_zone: string, filter?: { type?: string; name?: string }) => {
      if (filter?.type === "TXT" && filter.name === "ex.com") {
        // Existing SPF so we exercise the merge path.
        return [
          {
            id: "spf-existing",
            type: "TXT",
            name: "ex.com",
            content: "v=spf1 include:_spf.mx.cloudflare.net ~all",
            ttl: 1,
          },
        ];
      }
      return [];
    },
  );
  const createDnsRecord = vi.fn(
    async (_zone: string, rec: Record<string, unknown>) => ({
      id: `new-${(rec.content as string).slice(0, 8)}`,
      ttl: 1,
      ...rec,
    }),
  );
  const updateDnsRecord = vi.fn(
    async (_zone: string, id: string, rec: Record<string, unknown>) => ({
      id,
      ttl: 1,
      ...rec,
    }),
  );
  return {
    listZones: vi.fn(),
    getEmailRoutingStatus: vi.fn(),
    enableEmailRouting: vi.fn(),
    listDnsRecords,
    createDnsRecord,
    updateDnsRecord,
    listEmailRoutingRules: vi.fn(),
    createEmailRoutingRule: vi.fn(),
    listEmailRoutingDestinations: vi.fn(),
    createEmailRoutingDestination: vi.fn(),
  };
}

function cfDoneRow(overrides: Partial<MockRow> = {}): MockRow {
  return {
    id: BREVO_RUN_ID,
    user_id: "u1",
    domain: "ex.com",
    mailbox_local: "hello",
    status: "cf_done",
    cf_zone_id: "z1",
    cf_state: {
      account_id: "acc1",
      last_step: "create_rule",
      dns: { spf: "sp1", dmarc: "dm1" },
      rule_id: "r1",
    },
    error_msg: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("continueBrevoSetup — happy path", () => {
  test("runs create → dns → verify → finalize ending at brevo_done", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const cf = makeCfForBrevo();
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );

    const domain = {
      id: 42,
      domain_name: "ex.com",
      authenticated: false,
      dkim_record: {
        type: "TXT" as const,
        hostname: "mail._domainkey.ex.com",
        value: "v=DKIM1; p=ABC",
      },
      brevo_code_record: {
        type: "TXT" as const,
        hostname: "ex.com",
        value: "brevo-code:xyz",
      },
    };
    const verified = { ...domain, authenticated: true, verified: true };

    const brevoStub = {
      createSenderDomain: vi.fn().mockResolvedValue({ domain, created: true }),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn().mockResolvedValue(verified),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );

    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.runStatus).toBe("brevo_done");

    expect(brevoStub.createSenderDomain).toHaveBeenCalledOnce();
    expect(brevoStub.verifyDomain).toHaveBeenCalledOnce();
    // 3 TXT upserts (dkim create, brevo-code create, dmarc create, spf update)
    // = 3 creates + 1 update (SPF existed).
    expect(cf.createDnsRecord).toHaveBeenCalledTimes(3);
    expect(cf.updateDnsRecord).toHaveBeenCalledTimes(1);
    const updatedSpf = cf.updateDnsRecord.mock.calls[0][2] as {
      content: string;
    };
    expect(updatedSpf.content).toContain("include:spf.brevo.com");
    expect(admin.rows[0].status).toBe("brevo_done");
    expect(
      (admin.rows[0].cf_state.brevo as Record<string, unknown>).sender_id,
    ).toBe(42);
  });
});

describe("continueBrevoSetup — resume paths", () => {
  test("from brevo_sender_created → skips createSenderDomain, goes to DNS", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const priorBrevo = {
      domain: {
        id: 42,
        domain_name: "ex.com",
        authenticated: false,
        dkim_record: {
          type: "TXT" as const,
          hostname: "mail._domainkey.ex.com",
          value: "v=DKIM1; p=ABC",
        },
        brevo_code_record: {
          type: "TXT" as const,
          hostname: "ex.com",
          value: "brevo-code:xyz",
        },
      },
      sender_id: 42,
      sender_created: true,
    };
    const admin = makeAdminStub([
      cfDoneRow({
        status: "brevo_sender_created",
        cf_state: {
          ...cfDoneRow().cf_state,
          brevo: priorBrevo,
        },
      }),
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
    const cf = makeCfForBrevo();
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );
    const verified = {
      ...priorBrevo.domain,
      authenticated: true,
      verified: true,
    };
    const brevoStub = {
      createSenderDomain: vi.fn(),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn().mockResolvedValue(verified),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );

    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });
    expect(result.status).toBe("ok");
    expect(brevoStub.createSenderDomain).not.toHaveBeenCalled();
    expect(cf.createDnsRecord).toHaveBeenCalled();
    expect(brevoStub.verifyDomain).toHaveBeenCalled();
  });

  test("from brevo_dns_written → skips DNS, goes to verify", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([
      cfDoneRow({
        status: "brevo_dns_written",
        cf_state: {
          ...cfDoneRow().cf_state,
          brevo: {
            domain: {
              id: 42,
              domain_name: "ex.com",
              authenticated: false,
            },
            sender_id: 42,
            dns: {
              dkim: { id: "d1", action: "created" },
              brevo_code: { id: "b1", action: "created" },
              dmarc: { id: "dm1", action: "updated" },
              spf: { id: "sp1", action: "updated" },
            },
          },
        },
      }),
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
    const cf = makeCfForBrevo();
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );
    const brevoStub = {
      createSenderDomain: vi.fn(),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn().mockResolvedValue({
        id: 42,
        domain_name: "ex.com",
        authenticated: true,
        verified: true,
      }),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );
    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });
    expect(result.status).toBe("ok");
    expect(cf.createDnsRecord).not.toHaveBeenCalled();
    expect(cf.updateDnsRecord).not.toHaveBeenCalled();
    expect(brevoStub.verifyDomain).toHaveBeenCalledOnce();
    expect(admin.rows[0].status).toBe("brevo_done");
  });
});

describe("continueBrevoSetup — failure paths", () => {
  test("SPF conflict (-all closed policy) → spf_conflict errorKey, status failed", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    // Existing SPF ends in -all → addSpfInclude hard-fails.
    const cf = {
      ...makeCfForBrevo(),
      listDnsRecords: vi.fn(
        async (_z: string, filter?: { type?: string; name?: string }) => {
          if (filter?.type === "TXT" && filter.name === "ex.com") {
            return [
              {
                id: "spf-locked",
                type: "TXT",
                name: "ex.com",
                content: "v=spf1 include:_spf.google.com -all",
                ttl: 1,
              },
            ];
          }
          return [];
        },
      ),
    };
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );
    const brevoStub = {
      createSenderDomain: vi.fn().mockResolvedValue({
        domain: {
          id: 42,
          domain_name: "ex.com",
          authenticated: false,
          dkim_record: {
            type: "TXT" as const,
            hostname: "mail._domainkey.ex.com",
            value: "v=DKIM1; p=A",
          },
          brevo_code_record: {
            type: "TXT" as const,
            hostname: "ex.com",
            value: "brevo-code:x",
          },
        },
        created: true,
      }),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn(),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );

    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.spf_conflict");
    }
    expect(admin.rows[0].status).toBe("failed");
    expect(admin.rows[0].error_msg).toContain("spf_hard_fail");
  });

  test("domain-taken branch: createSenderDomain resolves existing via list", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const cf = makeCfForBrevo();
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );
    const existingDomain = {
      id: 99,
      domain_name: "ex.com",
      authenticated: true,
      dkim_record: {
        type: "TXT" as const,
        hostname: "mail._domainkey.ex.com",
        value: "v=DKIM1; p=EXISTING",
      },
      brevo_code_record: {
        type: "TXT" as const,
        hostname: "ex.com",
        value: "brevo-code:existing",
      },
    };
    const brevoStub = {
      createSenderDomain: vi
        .fn()
        .mockResolvedValue({ domain: existingDomain, created: false }),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn().mockResolvedValue({
        ...existingDomain,
        verified: true,
      }),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );

    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });
    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.runStatus).toBe("brevo_done");
    const brevo = admin.rows[0].cf_state.brevo as Record<string, unknown>;
    expect(brevo.sender_created).toBe(false);
    expect(brevo.sender_id).toBe(99);
  });

  test("rejects run not in brevo-resumable state", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow({ status: "started" })]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.run_wrong_state");
    } else {
      throw new Error("expected error");
    }
  });

  test("missing BREVO_API_KEY → brevo_invalid_token", async () => {
    delete process.env.BREVO_API_KEY;
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.brevo_invalid_token");
    } else {
      throw new Error("expected error");
    }
  });

  test("verify timeout (domain never authenticates) → brevo_verify_timeout, status stays brevo_dns_written", async () => {
    vi.useFakeTimers();
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const cf = makeCfForBrevo();
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );
    const domain = {
      id: 42,
      domain_name: "ex.com",
      authenticated: false,
      dkim_record: {
        type: "TXT" as const,
        hostname: "mail._domainkey.ex.com",
        value: "v=DKIM1; p=ABC",
      },
      brevo_code_record: {
        type: "TXT" as const,
        hostname: "ex.com",
        value: "brevo-code:xyz",
      },
    };
    const brevoStub = {
      createSenderDomain: vi.fn().mockResolvedValue({ domain, created: true }),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      // Always pending: authenticated:false, verified:false.
      verifyDomain: vi.fn().mockResolvedValue({
        ...domain,
        authenticated: false,
        verified: false,
      }),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );
    const p = continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });
    // Drain the three backoff waits (2s, 4s, 8s).
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    await vi.advanceTimersByTimeAsync(8000);
    const result = await p;
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.brevo_verify_timeout");
    } else {
      throw new Error("expected error");
    }
    // Status should be preserved at brevo_dns_written so user can retry.
    expect(admin.rows[0].status).toBe("brevo_dns_written");
    // Four poll attempts total: initial + 3 retries.
    expect(brevoStub.verifyDomain).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  test("already-authenticated domain — SPF merged + DMARC upserted, DKIM/brevo-code preserved, no verify polling", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const cf = makeCfForBrevo();
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );
    // Brevo returns an authenticated existing domain without DKIM records —
    // observed behavior on GET /senders/domains/{name} for authenticated
    // domains (DNS already written + verified, Brevo drops the records from
    // the response).
    const authenticatedDomain = {
      id: 77,
      domain_name: "ex.com",
      authenticated: true,
      verified: true,
    };
    const brevoStub = {
      createSenderDomain: vi
        .fn()
        .mockResolvedValue({ domain: authenticatedDomain, created: false }),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn(),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );

    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.runStatus).toBe("brevo_done");

    // DKIM + brevo-code writes MUST be skipped — Brevo didn't emit them
    // (authenticated domain short-circuits the create-sender response).
    const dkimCreateCalls = cf.createDnsRecord.mock.calls.filter((c) => {
      const rec = c[1] as { content?: string };
      return (
        rec.content?.startsWith("v=DKIM") ||
        rec.content?.includes("brevo-code:")
      );
    });
    const dkimUpdateCalls = cf.updateDnsRecord.mock.calls.filter((c) => {
      const rec = c[2] as { content?: string };
      return (
        rec.content?.startsWith("v=DKIM") ||
        rec.content?.includes("brevo-code:")
      );
    });
    expect(dkimCreateCalls).toHaveLength(0);
    expect(dkimUpdateCalls).toHaveLength(0);

    // SPF merge ran — existing v=spf1 include:_spf.mx.cloudflare.net got
    // include:spf.brevo.com appended via updateDnsRecord.
    const spfUpdate = cf.updateDnsRecord.mock.calls.find((c) => {
      const rec = c[2] as { content?: string };
      return rec.content?.includes("include:spf.brevo.com");
    });
    expect(spfUpdate).toBeDefined();

    // DMARC upsert ran — _dmarc.ex.com didn't exist in the stub, so
    // createDnsRecord was invoked with v=DMARC1 payload.
    const dmarcCreate = cf.createDnsRecord.mock.calls.find((c) => {
      const rec = c[1] as { content?: string; name?: string };
      return (
        rec.name === "_dmarc.ex.com" && rec.content?.startsWith("v=DMARC1")
      );
    });
    expect(dmarcCreate).toBeDefined();

    // Brevo's verify poll MUST NOT run — domain is already authenticated,
    // we fast-path through brevo_verified to brevo_done.
    expect(brevoStub.verifyDomain).not.toHaveBeenCalled();

    // Terminal status with the already_authenticated flag for observability.
    expect(admin.rows[0].status).toBe("brevo_done");
    const brevoState = admin.rows[0].cf_state.brevo as Record<string, unknown>;
    expect(brevoState.already_authenticated).toBe(true);
    expect(brevoState.sender_id).toBe(77);
    const dns = brevoState.dns as Record<string, { action: string }>;
    expect(dns.spf).toBeDefined();
    expect(dns.dmarc).toBeDefined();
    expect(dns.dkim).toBeUndefined();
    expect(dns.brevo_code).toBeUndefined();
  });

  test("already-authenticated + existing Brevo SPF → SPF upsert skipped (idempotent)", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );

    // CF stub variant: SPF already contains the Brevo include plus a
    // matching DMARC record, so addSpfInclude noops and upsertDnsByPattern
    // sees exact content match on both.
    const cf = makeCfForBrevo();
    cf.listDnsRecords = vi.fn(
      async (_z: string, filter?: { type?: string; name?: string }) => {
        if (filter?.type === "TXT" && filter.name === "ex.com") {
          return [
            {
              id: "spf-existing",
              type: "TXT",
              name: "ex.com",
              content:
                "v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all",
              ttl: 1,
            },
          ];
        }
        if (filter?.type === "TXT" && filter.name === "_dmarc.ex.com") {
          return [
            {
              id: "dmarc-existing",
              type: "TXT",
              name: "_dmarc.ex.com",
              content: "v=DMARC1; p=none; rua=mailto:postmaster@ex.com",
              ttl: 1,
            },
          ];
        }
        return [];
      },
    );
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );

    const brevoStub = {
      createSenderDomain: vi.fn().mockResolvedValue({
        domain: {
          id: 77,
          domain_name: "ex.com",
          authenticated: true,
          verified: true,
        },
        created: false,
      }),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn(),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );

    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") expect(result.runStatus).toBe("brevo_done");

    // Exact-content matches → no DNS writes at all. upsertDnsByPattern
    // returns action:"skipped" for both SPF and DMARC.
    expect(cf.createDnsRecord).not.toHaveBeenCalled();
    expect(cf.updateDnsRecord).not.toHaveBeenCalled();

    expect(admin.rows[0].status).toBe("brevo_done");
  });

  test("pending domain without DKIM records → brevo_state_unrecoverable errorKey", async () => {
    process.env.BREVO_API_KEY = "brevo-test-key";
    const admin = makeAdminStub([cfDoneRow()]);
    vi.mocked(sbModule.createServiceClient).mockReturnValue(
      admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
    );
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser({
        id: "u1",
        email: "me@g.com",
      }) as unknown as Awaited<ReturnType<typeof sbModule.createClient>>,
    );
    const cf = makeCfForBrevo();
    vi.mocked(cfModule.createCloudflareClient).mockReturnValue(
      cf as unknown as ReturnType<typeof cfModule.createCloudflareClient>,
    );
    // Defensive edge: domain is NOT authenticated yet but Brevo also did not
    // return DKIM — the sender entry is in a corrupted partial state.
    const pendingDomainNoRecords = {
      id: 78,
      domain_name: "ex.com",
      authenticated: false,
    };
    const brevoStub = {
      createSenderDomain: vi
        .fn()
        .mockResolvedValue({ domain: pendingDomainNoRecords, created: false }),
      getSenderDomain: vi.fn(),
      listSenderDomains: vi.fn(),
      verifyDomain: vi.fn(),
    };
    vi.mocked(brevoModule.createBrevoClient).mockReturnValue(
      brevoStub as unknown as ReturnType<typeof brevoModule.createBrevoClient>,
    );

    const result = await continueBrevoSetup({
      runId: BREVO_RUN_ID,
      cfToken: "cf_token_longer_than_20_chars",
    });

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errorKey).toBe("setup.errors.brevo_state_unrecoverable");
    }
    expect(admin.rows[0].status).toBe("failed");
    expect(admin.rows[0].error_msg).toContain("missing_records");
  });
});

// Silence unused-import false-positive on BrevoError import (kept for types
// in error-mapping assertions added later).
void BrevoError;

/* ------------------------------------------------------------------ *
 * Ticket #6 — Gmail Send-As actions
 * ------------------------------------------------------------------ */

describe("prepareGmailStep + confirmGmailSendAs", () => {
  const GMAIL_RUN_ID = "00000000-0000-4000-8000-000000000006";

  const SMTP_ENV: Record<string, string> = {
    BREVO_SMTP_HOST: "smtp-relay.brevo.com",
    BREVO_SMTP_PORT: "587",
    BREVO_SMTP_LOGIN: "owner@brevo.com",
    BREVO_SMTP_KEY: "xsmtpsib-abcdef0123456789",
    BREVO_SMTP_KEY_VERSION: "2",
  };

  function stubSmtpEnv(overrides: Record<string, string> = {}) {
    for (const [k, v] of Object.entries({ ...SMTP_ENV, ...overrides })) {
      vi.stubEnv(k, v);
    }
  }
  function unstubSmtpEnv() {
    vi.unstubAllEnvs();
  }

  function brevoDoneRow(overrides: Partial<MockRow> = {}): MockRow {
    return {
      id: GMAIL_RUN_ID,
      user_id: "u1",
      domain: "ex.com",
      mailbox_local: "hello",
      status: "brevo_done",
      cf_zone_id: "z1",
      cf_state: {},
      gmail_state: {},
      error_msg: null,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  function mockUser(
    user: { id: string; email: string | null } | null = {
      id: "u1",
      email: "me@g.com",
    },
  ) {
    vi.mocked(sbModule.createClient).mockResolvedValue(
      makeAnonStubWithUser(user) as unknown as Awaited<
        ReturnType<typeof sbModule.createClient>
      >,
    );
  }

  describe("prepareGmailStep", () => {
    beforeEach(() => {
      stubSmtpEnv();
    });
    afterEach(() => {
      unstubSmtpEnv();
    });

    test("brevo_done → gmail_instructions_shown + returns display object", async () => {
      const admin = makeAdminStub([brevoDoneRow()]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();

      const result = await prepareGmailStep({ runId: GMAIL_RUN_ID });

      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.runStatus).toBe("gmail_instructions_shown");
        expect(result.targetEmail).toBe("hello@ex.com");
        expect(result.displayName).toBe("Hello");
        expect(result.smtp).toEqual({
          host: "smtp-relay.brevo.com",
          port: 587,
          username: "owner@brevo.com",
          password: "xsmtpsib-abcdef0123456789",
          securityMode: "starttls",
          keyVersion: 2,
        });
      }
      expect(admin.rows[0].status).toBe("gmail_instructions_shown");
      expect(admin.rows[0].gmail_state).toMatchObject({
        target_email: "hello@ex.com",
        display_name: "Hello",
        smtp_config_version: 2,
      });
    });

    test("idempotent re-entry from gmail_instructions_shown", async () => {
      const admin = makeAdminStub([
        brevoDoneRow({
          status: "gmail_instructions_shown",
          gmail_state: {
            target_email: "hello@ex.com",
            display_name: "Hello",
            smtp_config_version: 1,
          },
        }),
      ]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();

      const result = await prepareGmailStep({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.runStatus).toBe("gmail_instructions_shown");
        expect(result.smtp.keyVersion).toBe(2); // env-fresh value
      }
      // gmail_state should reflect the current env version, not the old
      expect(admin.rows[0].gmail_state).toMatchObject({
        smtp_config_version: 2,
      });
    });

    test("status != brevo_done | gmail_instructions_shown → run_wrong_state", async () => {
      const admin = makeAdminStub([brevoDoneRow({ status: "cf_done" })]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();
      const result = await prepareGmailStep({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.run_wrong_state");
      }
      // No write on rejected precondition
      expect(admin.rows[0].status).toBe("cf_done");
    });

    test("run not owned by caller → run_not_found", async () => {
      const admin = makeAdminStub([brevoDoneRow({ user_id: "someone_else" })]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();
      const result = await prepareGmailStep({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.run_not_found");
      }
    });

    test("env missing → brevo_smtp_misconfigured (no DB write)", async () => {
      unstubSmtpEnv();
      stubSmtpEnv({ BREVO_SMTP_LOGIN: "" });
      const admin = makeAdminStub([brevoDoneRow()]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();
      const result = await prepareGmailStep({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.brevo_smtp_misconfigured");
      }
      expect(admin.rows[0].status).toBe("brevo_done");
    });

    test("unauthenticated → not_authenticated", async () => {
      const admin = makeAdminStub([brevoDoneRow()]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser(null);
      const result = await prepareGmailStep({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.not_authenticated");
      }
    });

    test("invalid runId format → invalid_input", async () => {
      mockUser();
      const result = await prepareGmailStep({ runId: "not-a-uuid" });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.invalid_input");
      }
    });

    test("title-cases snake_case mailbox_local for display name", async () => {
      const admin = makeAdminStub([
        brevoDoneRow({ mailbox_local: "support_team" }),
      ]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();
      const result = await prepareGmailStep({ runId: GMAIL_RUN_ID });
      if (result.status === "ok") {
        expect(result.displayName).toBe("Support Team");
        expect(result.targetEmail).toBe("support_team@ex.com");
      }
    });
  });

  describe("confirmGmailSendAs", () => {
    test("gmail_instructions_shown → done + confirmed_at set", async () => {
      const admin = makeAdminStub([
        brevoDoneRow({
          status: "gmail_instructions_shown",
          gmail_state: {
            target_email: "hello@ex.com",
            display_name: "Hello",
            smtp_config_version: 1,
          },
        }),
      ]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();

      const before = Date.now();
      const result = await confirmGmailSendAs({ runId: GMAIL_RUN_ID });
      const after = Date.now();

      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.runStatus).toBe("done");
      }
      expect(admin.rows[0].status).toBe("done");
      const confirmedAt = (admin.rows[0].gmail_state as Record<string, unknown>)
        ?.confirmed_at;
      expect(typeof confirmedAt).toBe("string");
      const t = new Date(confirmedAt as string).getTime();
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
      // Prior gmail_state fields preserved
      expect(admin.rows[0].gmail_state).toMatchObject({
        target_email: "hello@ex.com",
      });
    });

    test("idempotent on already-done run — returns ok, no write", async () => {
      const admin = makeAdminStub([
        brevoDoneRow({
          status: "done",
          gmail_state: { confirmed_at: "2026-04-22T10:00:00Z" },
        }),
      ]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();
      const result = await confirmGmailSendAs({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.runStatus).toBe("done");
      }
      // confirmed_at should be preserved as-is (no re-write)
      expect(admin.updateCalls).toHaveLength(0);
      expect(
        (admin.rows[0].gmail_state as Record<string, unknown>)?.confirmed_at,
      ).toBe("2026-04-22T10:00:00Z");
    });

    test("status = cf_done → run_wrong_state", async () => {
      const admin = makeAdminStub([brevoDoneRow({ status: "cf_done" })]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();
      const result = await confirmGmailSendAs({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.run_wrong_state");
      }
    });

    test("run not owned by caller → run_not_found", async () => {
      const admin = makeAdminStub([
        brevoDoneRow({
          user_id: "other",
          status: "gmail_instructions_shown",
        }),
      ]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser();
      const result = await confirmGmailSendAs({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.run_not_found");
      }
    });

    test("unauthenticated → not_authenticated", async () => {
      const admin = makeAdminStub([
        brevoDoneRow({ status: "gmail_instructions_shown" }),
      ]);
      vi.mocked(sbModule.createServiceClient).mockReturnValue(
        admin as unknown as ReturnType<typeof sbModule.createServiceClient>,
      );
      mockUser(null);
      const result = await confirmGmailSendAs({ runId: GMAIL_RUN_ID });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.errorKey).toBe("setup.errors.not_authenticated");
      }
    });
  });
});
