/**
 * SPF TXT merge helper for Ticket #4b Postmark integration.
 *
 * Parses `v=spf1 …` strings into a structured shape, merges a new
 * `include:` (or other mechanism) preserving existing ones, and
 * renders back to a DNS-safe TXT string.
 *
 * Background: pipeline #4a discovered that naive "first-match
 * overwrite" on TXT @ records destroys prior Postmark/Google/etc. SPF
 * setups on zones the user already wired elsewhere. #4b's Postmark step
 * needs `include:spf.postmark.com` appended to whatever SPF the zone
 * currently carries, not a blind overwrite.
 *
 * Scope: SPF mechanism list + qualifier. No modifiers (redirect=, exp=)
 * — we don't emit them, and pass them through verbatim if present.
 */

export type SpfQualifier = "~all" | "-all" | "+all" | "?all";

export type SpfMechanism = {
  /** Prefix qualifier of the mechanism: +, -, ~, or ? (default +). */
  qualifier: "+" | "-" | "~" | "?";
  /** The mechanism name: include, ip4, ip6, a, mx, ptr, exists. */
  name: "include" | "ip4" | "ip6" | "a" | "mx" | "ptr" | "exists";
  /** Value after the colon, or empty for bare `a`/`mx`. */
  value: string;
};

export type SpfRecord = {
  /** All mechanisms in order of appearance, excluding the trailing `all`. */
  mechanisms: SpfMechanism[];
  /** Terminal `all` qualifier. Required for a valid record. */
  qualifier: SpfQualifier;
  /** Raw tokens we did not recognize — preserved verbatim for round-trip. */
  unknown: string[];
};

export class SpfParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpfParseError";
  }
}

export class SpfMergeHardFail extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpfMergeHardFail";
  }
}

const MECHANISM_NAMES = new Set<SpfMechanism["name"]>([
  "include",
  "ip4",
  "ip6",
  "a",
  "mx",
  "ptr",
  "exists",
]);

const QUALIFIERS = new Set(["~all", "-all", "+all", "?all"] as const);

const MAX_TXT_LENGTH = 255; // DNS TXT per-string limit.

/**
 * Parse an SPF TXT record value. Accepts the exact string as stored
 * in DNS (without surrounding quotes). Case-insensitive where SPF is.
 */
export function parseSpf(input: string): SpfRecord {
  const trimmed = input.trim();
  if (trimmed === "") {
    throw new SpfParseError("empty SPF record");
  }
  const tokens = trimmed.split(/\s+/);
  if (tokens[0]?.toLowerCase() !== "v=spf1") {
    throw new SpfParseError(
      `SPF record must start with v=spf1, got "${tokens[0]}"`,
    );
  }

  const mechanisms: SpfMechanism[] = [];
  const unknown: string[] = [];
  let qualifier: SpfQualifier | null = null;

  for (let i = 1; i < tokens.length; i++) {
    const tok = tokens[i];
    const lower = tok.toLowerCase();
    const maybeAll = QUALIFIERS.has(lower as SpfQualifier);
    if (maybeAll) {
      if (qualifier !== null) {
        throw new SpfParseError(`duplicate all qualifier: ${tok}`);
      }
      qualifier = lower as SpfQualifier;
      continue;
    }

    const parsed = parseMechanism(tok);
    if (parsed) {
      mechanisms.push(parsed);
    } else {
      // Modifiers like redirect= / exp=, or anything we don't model.
      unknown.push(tok);
    }
  }

  if (qualifier === null) {
    throw new SpfParseError(
      `missing terminal all qualifier (~all/-all/+all/?all)`,
    );
  }

  return { mechanisms, qualifier, unknown };
}

function parseMechanism(token: string): SpfMechanism | null {
  const firstChar = token[0];
  let rest = token;
  let qual: SpfMechanism["qualifier"] = "+";
  if (
    firstChar === "+" ||
    firstChar === "-" ||
    firstChar === "~" ||
    firstChar === "?"
  ) {
    qual = firstChar;
    rest = token.slice(1);
  }
  const colon = rest.indexOf(":");
  const nameRaw = colon === -1 ? rest : rest.slice(0, colon);
  const value = colon === -1 ? "" : rest.slice(colon + 1);
  const name = nameRaw.toLowerCase();
  if (!MECHANISM_NAMES.has(name as SpfMechanism["name"])) return null;
  return {
    qualifier: qual,
    name: name as SpfMechanism["name"],
    value,
  };
}

/**
 * Render a parsed SPF record back into the canonical TXT string.
 * Order: v=spf1 → mechanisms → unknown → terminal qualifier.
 */
export function renderSpf(record: SpfRecord): string {
  const parts: string[] = ["v=spf1"];
  for (const m of record.mechanisms) {
    parts.push(formatMechanism(m));
  }
  for (const u of record.unknown) {
    parts.push(u);
  }
  parts.push(record.qualifier);
  return parts.join(" ");
}

function formatMechanism(m: SpfMechanism): string {
  const qualPrefix = m.qualifier === "+" ? "" : m.qualifier;
  const suffix = m.value === "" ? "" : `:${m.value}`;
  return `${qualPrefix}${m.name}${suffix}`;
}

/**
 * Merge a mechanism into an existing SPF record.
 *
 * Rules:
 * - If a mechanism with the same name + value already exists, return
 *   the record unchanged (no-op). Matching is case-insensitive on name
 *   and value.
 * - Otherwise append the new mechanism before the terminal qualifier.
 * - If the terminal qualifier is `-all` we reject the merge with
 *   `SpfMergeHardFail`: a hard-fail policy means the zone owner has
 *   explicitly declared a closed sender set, and silently adding a
 *   Postmark include would contradict their intent. Callers surface this
 *   to the user so they can change their SPF policy first.
 * - Final rendered length must stay ≤ 255 chars (per-string DNS TXT
 *   limit). Overflow throws a clear error rather than silently
 *   truncating.
 */
export function mergeSpfMechanism(
  record: SpfRecord,
  mechanism: SpfMechanism,
): SpfRecord {
  if (record.qualifier === "-all") {
    throw new SpfMergeHardFail(
      "SPF record ends in -all (hard fail); merging a new include would contradict the zone's closed sender policy. Ask the user to soften to ~all before adding Postmark.",
    );
  }

  const exists = record.mechanisms.some(
    (m) =>
      m.name === mechanism.name &&
      m.value.toLowerCase() === mechanism.value.toLowerCase(),
  );
  if (exists) return record;

  const merged: SpfRecord = {
    mechanisms: [...record.mechanisms, mechanism],
    qualifier: record.qualifier,
    unknown: record.unknown,
  };
  const rendered = renderSpf(merged);
  if (rendered.length > MAX_TXT_LENGTH) {
    throw new SpfMergeHardFail(
      `SPF record would exceed 255 chars after merge (got ${rendered.length}); the zone already has too many mechanisms to add another include.`,
    );
  }
  return merged;
}

/**
 * Convenience: add `include:<host>` to an existing SPF TXT string and
 * return the new TXT string. Throws on parse errors, hard-fail, or
 * overflow. Returns unchanged input if the include is already present.
 */
export function addSpfInclude(currentTxt: string, host: string): string {
  const parsed = parseSpf(currentTxt);
  const merged = mergeSpfMechanism(parsed, {
    qualifier: "+",
    name: "include",
    value: host,
  });
  return renderSpf(merged);
}
