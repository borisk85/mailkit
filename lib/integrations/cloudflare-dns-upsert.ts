/**
 * Content-pattern DNS upsert helper for Ticket #4b.
 *
 * Ticket #4a's first-match-by-list-position upsert is unsafe on real
 * zones: TXT @ commonly holds SPF + Postmark verification + Google site
 * verification + more, and CF API list order is not stable. Naive
 * "update existing[0]" overwrites whichever record happened to come
 * first — on mailkit-test.ru smoke it killed the Postmark SPF. This
 * helper matches existing TXT records by **content prefix**, so an SPF
 * upsert targets the SPF record regardless of list order, and Postmark
 * verification / Google site verification live alongside untouched.
 *
 * Shape of work, per record:
 *   1. listDnsRecords({ type, name })
 *   2. find the existing record whose content starts with the given
 *      pattern (case-insensitive). If zero matches → create. If one →
 *      compare content, exact match → skip, different → update. If
 *      multiple matches → throw (caller must narrow the pattern).
 *
 * MX is intentionally unsupported — CF Email Routing manages MX and
 * `/dns_records` PUT/POST on MX returns 890190 once routing is on
 * (finding #1 from the #4a smoke).
 */

import type { CloudflareClient, DnsRecord, DnsRecordInput } from "./cloudflare";

export type UpsertByPatternInput = {
  /** Pattern matched case-insensitively against the start of existing content. */
  pattern: string;
  /** The desired final record. `type` must not be "MX". */
  record: DnsRecordInput;
};

export type UpsertResult =
  | { action: "created"; id: string; record: DnsRecord }
  | {
      action: "updated";
      id: string;
      record: DnsRecord;
      previousContent: string;
    }
  | { action: "skipped"; id: string; record: DnsRecord; reason: "exact_match" };

export class DnsUpsertError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DnsUpsertError";
  }
}

/**
 * Find one TXT (or other type) record whose content starts with the
 * given pattern. Returns null when no matches, throws when multiple.
 */
export function findByContentPrefix(
  records: DnsRecord[],
  pattern: string,
): DnsRecord | null {
  const needle = pattern.toLowerCase();
  const matches = records.filter((r) =>
    r.content.toLowerCase().startsWith(needle),
  );
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    const ids = matches.map((m) => m.id).join(", ");
    throw new DnsUpsertError(
      `ambiguous match: ${matches.length} records start with "${pattern}" (ids: ${ids}). Narrow the pattern.`,
    );
  }
  return matches[0];
}

export async function upsertDnsByPattern(
  cf: CloudflareClient,
  zoneId: string,
  input: UpsertByPatternInput,
): Promise<UpsertResult> {
  if (input.record.type === "MX") {
    throw new DnsUpsertError(
      "MX records are managed by Cloudflare Email Routing and cannot be written via /dns_records (CF error 890190). Skip MX in pipelines that run after enableEmailRouting.",
    );
  }

  const existing = await cf.listDnsRecords(zoneId, {
    type: input.record.type,
    name: input.record.name,
  });
  const match = findByContentPrefix(existing, input.pattern);

  if (!match) {
    const created = await cf.createDnsRecord(zoneId, input.record);
    return { action: "created", id: created.id, record: created };
  }

  if (match.content === input.record.content) {
    return {
      action: "skipped",
      id: match.id,
      record: match,
      reason: "exact_match",
    };
  }

  const updated = await cf.updateDnsRecord(zoneId, match.id, input.record);
  return {
    action: "updated",
    id: updated.id,
    record: updated,
    previousContent: match.content,
  };
}
