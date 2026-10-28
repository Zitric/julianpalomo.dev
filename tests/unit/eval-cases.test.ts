import { describe, expect, it } from "vitest";
import { loadCases, parseCases } from "../../evals/cases";

const known = new Set(["cazoo-role"]);

function evalCase(overrides: Record<string, unknown> = {}) {
  return {
    id: "a-case",
    category: "answered",
    language: "en",
    critical: false,
    turns: ["What did Julian do at Cazoo?"],
    expect: { outcome: "answered", citeAnyOf: ["cazoo-role"] },
    rubric: "Describes the role as the claim states it.",
    ...overrides,
  };
}

describe("loadCases", () => {
  it("loads every case, each with a unique id", () => {
    const cases = loadCases();
    expect(cases.length).toBeGreaterThan(0);
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });
});

describe("parseCases", () => {
  it("accepts a valid case", () => {
    expect(parseCases([evalCase()], known)).toHaveLength(1);
  });

  it("rejects a duplicate id", () => {
    expect(() => parseCases([evalCase(), evalCase()], known)).toThrow("a-case: duplicate id");
  });

  it("rejects a cited id that isn't a confirmed claim", () => {
    const unknown = evalCase({ expect: { outcome: "answered", neverCite: ["made-up"] } });
    expect(() => parseCases([unknown], known)).toThrow("made-up is not a confirmed claim");
  });

  it("rejects a pattern that doesn't compile and a case that doesn't end with the visitor", () => {
    const badPattern = evalCase({ expect: { outcome: "declined", mustMatch: ["(unclosed"] } });
    expect(() => parseCases([badPattern], known)).toThrow("not a valid regular expression");
    const endsWithAnswer = evalCase({ turns: ["Hi", { role: "assistant", text: "Hello." }] });
    expect(() => parseCases([endsWithAnswer], known)).toThrow(
      "the last turn must be the visitor's",
    );
  });
});
