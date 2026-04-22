import { describe, expect, test } from "vitest";

import {
  addSpfInclude,
  mergeSpfMechanism,
  parseSpf,
  renderSpf,
  SpfMergeHardFail,
  SpfParseError,
} from "./dns-merge";

describe("parseSpf", () => {
  test("parses bare v=spf1 ~all", () => {
    const r = parseSpf("v=spf1 ~all");
    expect(r.mechanisms).toEqual([]);
    expect(r.qualifier).toBe("~all");
    expect(r.unknown).toEqual([]);
  });

  test("parses include + ip4 + mx + terminal", () => {
    const r = parseSpf(
      "v=spf1 include:_spf.google.com ip4:192.0.2.0/24 mx ~all",
    );
    expect(r.mechanisms).toEqual([
      { qualifier: "+", name: "include", value: "_spf.google.com" },
      { qualifier: "+", name: "ip4", value: "192.0.2.0/24" },
      { qualifier: "+", name: "mx", value: "" },
    ]);
    expect(r.qualifier).toBe("~all");
  });

  test("parses qualifiers on mechanisms", () => {
    const r = parseSpf("v=spf1 -include:bad.example.com ~all");
    expect(r.mechanisms[0]).toEqual({
      qualifier: "-",
      name: "include",
      value: "bad.example.com",
    });
  });

  test("captures unknown tokens (redirect=) into .unknown", () => {
    const r = parseSpf(
      "v=spf1 include:a.example.com redirect=_spf.example.org ~all",
    );
    expect(r.mechanisms).toHaveLength(1);
    expect(r.unknown).toEqual(["redirect=_spf.example.org"]);
    expect(r.qualifier).toBe("~all");
  });

  test("case-insensitive v=spf1 and qualifier", () => {
    const r = parseSpf("V=SPF1 include:EXAMPLE.com ~ALL");
    expect(r.mechanisms).toHaveLength(1);
    expect(r.qualifier).toBe("~all");
  });

  test("throws on empty input", () => {
    expect(() => parseSpf("")).toThrow(SpfParseError);
  });

  test("throws on missing v=spf1 prefix", () => {
    expect(() => parseSpf("include:example.com ~all")).toThrow(SpfParseError);
  });

  test("throws on missing terminal all", () => {
    expect(() => parseSpf("v=spf1 include:example.com")).toThrow(SpfParseError);
  });

  test("throws on duplicate terminal", () => {
    expect(() => parseSpf("v=spf1 ~all -all")).toThrow(SpfParseError);
  });
});

describe("renderSpf round-trip", () => {
  test("renders back to the canonical form", () => {
    const input = "v=spf1 include:_spf.google.com ip4:192.0.2.0/24 ~all";
    expect(renderSpf(parseSpf(input))).toBe(input);
  });

  test("preserves unknown tokens in order", () => {
    const input = "v=spf1 include:a.com redirect=_spf.example.org ~all";
    expect(renderSpf(parseSpf(input))).toBe(input);
  });

  test("drops default + qualifier from mechanisms", () => {
    const input = "v=spf1 +include:a.com ~all";
    // Parser normalizes + to the default but render keeps it implicit.
    expect(renderSpf(parseSpf(input))).toBe("v=spf1 include:a.com ~all");
  });
});

describe("mergeSpfMechanism", () => {
  test("appends a new include before the terminal qualifier", () => {
    const r = parseSpf("v=spf1 ~all");
    const out = mergeSpfMechanism(r, {
      qualifier: "+",
      name: "include",
      value: "spf.brevo.com",
    });
    expect(renderSpf(out)).toBe("v=spf1 include:spf.brevo.com ~all");
  });

  test("no-op when the include is already present", () => {
    const r = parseSpf("v=spf1 include:spf.brevo.com ~all");
    const out = mergeSpfMechanism(r, {
      qualifier: "+",
      name: "include",
      value: "spf.brevo.com",
    });
    expect(renderSpf(out)).toBe("v=spf1 include:spf.brevo.com ~all");
    expect(out).toBe(r); // same reference, short-circuit
  });

  test("case-insensitive existence check", () => {
    const r = parseSpf("v=spf1 include:SPF.brevo.COM ~all");
    const out = mergeSpfMechanism(r, {
      qualifier: "+",
      name: "include",
      value: "spf.brevo.com",
    });
    expect(out).toBe(r);
  });

  test("preserves existing mechanisms and order", () => {
    const r = parseSpf("v=spf1 include:_spf.google.com ip4:192.0.2.0/24 ~all");
    const out = mergeSpfMechanism(r, {
      qualifier: "+",
      name: "include",
      value: "spf.brevo.com",
    });
    expect(renderSpf(out)).toBe(
      "v=spf1 include:_spf.google.com ip4:192.0.2.0/24 include:spf.brevo.com ~all",
    );
  });

  test("hard-fail on -all closed policy", () => {
    const r = parseSpf("v=spf1 include:_spf.google.com -all");
    expect(() =>
      mergeSpfMechanism(r, {
        qualifier: "+",
        name: "include",
        value: "spf.brevo.com",
      }),
    ).toThrow(SpfMergeHardFail);
  });

  test("hard-fail when final length exceeds 255 chars", () => {
    const filler = Array.from(
      { length: 10 },
      (_, i) => `include:x${i}.example.net`,
    ).join(" ");
    const r = parseSpf(
      `v=spf1 ${filler} include:${"a".repeat(80)}.example.com ~all`,
    );
    expect(() =>
      mergeSpfMechanism(r, {
        qualifier: "+",
        name: "include",
        value: `${"b".repeat(80)}.brevo.com`,
      }),
    ).toThrow(SpfMergeHardFail);
  });
});

describe("addSpfInclude (convenience)", () => {
  test("adds brevo include to default-only record", () => {
    expect(addSpfInclude("v=spf1 ~all", "spf.brevo.com")).toBe(
      "v=spf1 include:spf.brevo.com ~all",
    );
  });

  test("no-op when already present", () => {
    expect(
      addSpfInclude("v=spf1 include:spf.brevo.com ~all", "spf.brevo.com"),
    ).toBe("v=spf1 include:spf.brevo.com ~all");
  });

  test("merges alongside existing Google/Cloudflare includes", () => {
    expect(
      addSpfInclude(
        "v=spf1 include:_spf.google.com include:_spf.mx.cloudflare.net ~all",
        "spf.brevo.com",
      ),
    ).toBe(
      "v=spf1 include:_spf.google.com include:_spf.mx.cloudflare.net include:spf.brevo.com ~all",
    );
  });

  test("hard-fail surfaces through convenience wrapper", () => {
    expect(() =>
      addSpfInclude("v=spf1 include:_spf.google.com -all", "spf.brevo.com"),
    ).toThrow(SpfMergeHardFail);
  });
});
