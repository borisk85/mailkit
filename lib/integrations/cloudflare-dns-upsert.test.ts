import { describe, expect, test, vi } from "vitest";

import type { CloudflareClient, DnsRecord } from "./cloudflare";
import {
  DnsUpsertError,
  findByContentPrefix,
  upsertDnsByPattern,
} from "./cloudflare-dns-upsert";

function rec(
  partial: Partial<DnsRecord> & Pick<DnsRecord, "id" | "content">,
): DnsRecord {
  return {
    type: "TXT",
    name: "example.com",
    ttl: 1,
    ...partial,
  } as DnsRecord;
}

function makeCf(overrides: Partial<CloudflareClient>): CloudflareClient {
  return {
    listZones: vi.fn(),
    getEmailRoutingStatus: vi.fn(),
    enableEmailRouting: vi.fn(),
    listDnsRecords: vi.fn(),
    createDnsRecord: vi.fn(),
    updateDnsRecord: vi.fn(),
    listEmailRoutingRules: vi.fn(),
    createEmailRoutingRule: vi.fn(),
    listEmailRoutingDestinations: vi.fn(),
    createEmailRoutingDestination: vi.fn(),
    ...overrides,
  } as CloudflareClient;
}

describe("findByContentPrefix", () => {
  test("returns null when no match", () => {
    const out = findByContentPrefix(
      [rec({ id: "a", content: "brevo-code:abcd" })],
      "v=spf1",
    );
    expect(out).toBeNull();
  });

  test("returns the single matching record", () => {
    const match = rec({ id: "spf", content: "v=spf1 include:x ~all" });
    const out = findByContentPrefix(
      [
        rec({ id: "brevo", content: "brevo-code:abcd" }),
        match,
        rec({ id: "google", content: "google-site-verification=xyz" }),
      ],
      "v=spf1",
    );
    expect(out).toBe(match);
  });

  test("case-insensitive prefix match", () => {
    const out = findByContentPrefix(
      [rec({ id: "a", content: "V=SPF1 include:x ~all" })],
      "v=spf1",
    );
    expect(out?.id).toBe("a");
  });

  test("throws when two records share the prefix (ambiguous)", () => {
    expect(() =>
      findByContentPrefix(
        [
          rec({ id: "a", content: "v=spf1 include:x ~all" }),
          rec({ id: "b", content: "v=spf1 include:y ~all" }),
        ],
        "v=spf1",
      ),
    ).toThrow(DnsUpsertError);
  });
});

describe("upsertDnsByPattern", () => {
  test("no existing record → create", async () => {
    const listDnsRecords = vi.fn().mockResolvedValue([]);
    const createDnsRecord = vi
      .fn()
      .mockResolvedValue(
        rec({ id: "new1", content: "v=spf1 include:spf.brevo.com ~all" }),
      );
    const cf = makeCf({ listDnsRecords, createDnsRecord });
    const out = await upsertDnsByPattern(cf, "z1", {
      pattern: "v=spf1",
      record: {
        type: "TXT",
        name: "example.com",
        content: "v=spf1 include:spf.brevo.com ~all",
        ttl: 1,
      },
    });
    expect(out.action).toBe("created");
    if (out.action === "created") expect(out.id).toBe("new1");
    expect(createDnsRecord).toHaveBeenCalledOnce();
  });

  test("existing with different content → update, previousContent preserved", async () => {
    const listDnsRecords = vi
      .fn()
      .mockResolvedValue([
        rec({ id: "old", content: "v=spf1 include:spf.brevo.com ~all" }),
        rec({ id: "google", content: "google-site-verification=abc" }),
      ]);
    const updateDnsRecord = vi
      .fn()
      .mockResolvedValue(
        rec({
          id: "old",
          content:
            "v=spf1 include:spf.brevo.com include:_spf.mx.cloudflare.net ~all",
        }),
      );
    const cf = makeCf({ listDnsRecords, updateDnsRecord });
    const out = await upsertDnsByPattern(cf, "z1", {
      pattern: "v=spf1",
      record: {
        type: "TXT",
        name: "example.com",
        content:
          "v=spf1 include:spf.brevo.com include:_spf.mx.cloudflare.net ~all",
        ttl: 1,
      },
    });
    expect(out.action).toBe("updated");
    if (out.action === "updated") {
      expect(out.id).toBe("old");
      expect(out.previousContent).toBe("v=spf1 include:spf.brevo.com ~all");
    }
  });

  test("existing with exact content → skip, no write", async () => {
    const listDnsRecords = vi
      .fn()
      .mockResolvedValue([
        rec({ id: "sp", content: "v=spf1 include:spf.brevo.com ~all" }),
      ]);
    const createDnsRecord = vi.fn();
    const updateDnsRecord = vi.fn();
    const cf = makeCf({ listDnsRecords, createDnsRecord, updateDnsRecord });
    const out = await upsertDnsByPattern(cf, "z1", {
      pattern: "v=spf1",
      record: {
        type: "TXT",
        name: "example.com",
        content: "v=spf1 include:spf.brevo.com ~all",
        ttl: 1,
      },
    });
    expect(out.action).toBe("skipped");
    expect(createDnsRecord).not.toHaveBeenCalled();
    expect(updateDnsRecord).not.toHaveBeenCalled();
  });

  test("picks the SPF record regardless of list order — Brevo verification stays alive", async () => {
    // CF API returns brevo-code FIRST, SPF second. Naive upsert would
    // overwrite brevo-code; content-pattern upsert targets SPF.
    const listDnsRecords = vi
      .fn()
      .mockResolvedValue([
        rec({ id: "brevo", content: "brevo-code:abcd" }),
        rec({ id: "spf", content: "v=spf1 ~all" }),
      ]);
    const updateDnsRecord = vi
      .fn()
      .mockResolvedValue(
        rec({ id: "spf", content: "v=spf1 include:spf.brevo.com ~all" }),
      );
    const cf = makeCf({ listDnsRecords, updateDnsRecord });
    const out = await upsertDnsByPattern(cf, "z1", {
      pattern: "v=spf1",
      record: {
        type: "TXT",
        name: "example.com",
        content: "v=spf1 include:spf.brevo.com ~all",
        ttl: 1,
      },
    });
    expect(out.action).toBe("updated");
    if (out.action === "updated") expect(out.id).toBe("spf");
    expect(updateDnsRecord.mock.calls[0][1]).toBe("spf");
  });

  test("ambiguous (two TXT start with same pattern) → throws, no write", async () => {
    const listDnsRecords = vi
      .fn()
      .mockResolvedValue([
        rec({ id: "a", content: "v=spf1 include:x ~all" }),
        rec({ id: "b", content: "v=spf1 include:y ~all" }),
      ]);
    const createDnsRecord = vi.fn();
    const updateDnsRecord = vi.fn();
    const cf = makeCf({ listDnsRecords, createDnsRecord, updateDnsRecord });
    await expect(
      upsertDnsByPattern(cf, "z1", {
        pattern: "v=spf1",
        record: {
          type: "TXT",
          name: "example.com",
          content: "v=spf1 include:spf.brevo.com ~all",
          ttl: 1,
        },
      }),
    ).rejects.toThrow(DnsUpsertError);
    expect(createDnsRecord).not.toHaveBeenCalled();
    expect(updateDnsRecord).not.toHaveBeenCalled();
  });

  test("MX rejected with DnsUpsertError — Email Routing owns MX", async () => {
    const cf = makeCf({});
    await expect(
      upsertDnsByPattern(cf, "z1", {
        pattern: "",
        record: {
          type: "MX",
          name: "example.com",
          content: "route1.mx.cloudflare.net",
          priority: 1,
          ttl: 1,
        },
      }),
    ).rejects.toThrow(DnsUpsertError);
  });

  test("brevo-code verification prefix (unique zone identifier)", async () => {
    const listDnsRecords = vi
      .fn()
      .mockResolvedValue([
        rec({ id: "spf", content: "v=spf1 include:x ~all" }),
      ]);
    const createDnsRecord = vi
      .fn()
      .mockResolvedValue(rec({ id: "br", content: "brevo-code:xyz123" }));
    const cf = makeCf({ listDnsRecords, createDnsRecord });
    const out = await upsertDnsByPattern(cf, "z1", {
      pattern: "brevo-code:",
      record: {
        type: "TXT",
        name: "example.com",
        content: "brevo-code:xyz123",
        ttl: 1,
      },
    });
    expect(out.action).toBe("created");
  });
});
