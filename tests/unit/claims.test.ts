import { describe, expect, it } from "vitest";
import data from "../../src/content/claims.json";
import { type Claim, confirmedClaims, keepConfirmed, parseClaims } from "../../src/lib/claims";

const valid: Claim = {
  id: "example-claim",
  label: "Example",
  text: "An example claim.",
  area: "experience",
  org: "Example Org",
  source: "cv",
  confirmedByJulian: null,
};

function tomorrowUtc(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** What in a public claim text would leak private or internal data. */
function privacyProblems(value: string): string[] {
  const problems: string[] = [];
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) problems.push("email address");
  if (/\b[A-Z]{2,}[A-Z0-9]*-\d+\b/.test(value)) problems.push("ticket key");
  if (/#\d/.test(value)) problems.push("# followed by digits");
  for (const [url] of value.matchAll(/https?:\/\/\S+/g)) {
    const allowed =
      /^https?:\/\/((www\.)?formatglasgow\.com|github\.com\/julian-palomo)(\/|$)/.test(url);
    if (!allowed) problems.push(`link ${url}`);
  }
  return problems;
}

describe("claims.json", () => {
  it("parses", () => {
    expect(() => parseClaims(data)).not.toThrow();
  });

  it("holds no private or internal data in any text or label", () => {
    for (const claim of parseClaims(data)) {
      expect(privacyProblems(claim.text), claim.id).toEqual([]);
      expect(privacyProblems(claim.label), claim.id).toEqual([]);
    }
  });
});

describe("privacyProblems", () => {
  it("flags emails, ticket keys, issue numbers and outside links", () => {
    expect(privacyProblems("Mail me at someone@example.com")).toEqual(["email address"]);
    expect(privacyProblems("Fixed ABC-123")).toEqual(["ticket key"]);
    expect(privacyProblems("Merged in #42")).toEqual(["# followed by digits"]);
    expect(privacyProblems("See https://wiki.example.com/page")).toEqual([
      "link https://wiki.example.com/page",
    ]);
  });

  it("allows links to formatglasgow.com and github.com/julian-palomo", () => {
    expect(
      privacyProblems(
        "Built https://formatglasgow.com and https://github.com/julian-palomo/form-at",
      ),
    ).toEqual([]);
  });
});

describe("confirmedClaims", () => {
  it("returns only dated claims from the real file", () => {
    expect(confirmedClaims().every((claim) => claim.confirmedByJulian !== null)).toBe(true);
  });
});

describe("keepConfirmed", () => {
  it("keeps every dated claim and drops every null one", () => {
    const claims: Claim[] = [
      { ...valid, id: "one", confirmedByJulian: "2026-10-01" },
      { ...valid, id: "two", confirmedByJulian: null },
      { ...valid, id: "three", confirmedByJulian: "2026-10-27" },
      { ...valid, id: "four", confirmedByJulian: null },
    ];
    expect(keepConfirmed(claims).map((claim) => claim.id)).toEqual(["one", "three"]);
  });
});

describe("parseClaims", () => {
  it("accepts a valid claim, with or without org", () => {
    const { org: _org, ...withoutOrg } = valid;
    expect(parseClaims([valid, { ...withoutOrg, id: "no-org" }])).toHaveLength(2);
  });

  it("accepts a confirmation dated today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(() => parseClaims([{ ...valid, confirmedByJulian: today }])).not.toThrow();
  });

  it("rejects a duplicate id", () => {
    expect(() => parseClaims([valid, { ...valid }])).toThrow(/duplicate id/);
  });

  it.each(["Example-claim", "example claim"])("rejects the id %j", (id) => {
    expect(() => parseClaims([{ ...valid, id }])).toThrow();
  });

  it("rejects an empty text", () => {
    expect(() => parseClaims([{ ...valid, text: "" }])).toThrow();
  });

  it("rejects an unknown field, such as a misspelt confirmedByJulian", () => {
    expect(() => parseClaims([{ ...valid, confirmedByJulain: "2026-10-01" }])).toThrow();
  });

  it("rejects a confirmation dated in the future", () => {
    expect(() => parseClaims([{ ...valid, confirmedByJulian: tomorrowUtc() }])).toThrow(/future/);
  });

  it.each(["2026-13-01", "2026-02-30", "27/10/2026"])("rejects the malformed date %j", (date) => {
    expect(() => parseClaims([{ ...valid, confirmedByJulian: date }])).toThrow();
  });
});
