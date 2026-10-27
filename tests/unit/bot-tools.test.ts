import type { InferToolInput, InferToolOutput, Tool } from "ai";
import { describe, expect, it } from "vitest";
import { buildTools, getClaimsInput, searchClaimsInput } from "../../src/lib/bot/tools";
import type { Claim } from "../../src/lib/claims";

const claims: Claim[] = [
  {
    id: "react-at-acme",
    label: "React",
    text: "Built the Acme dashboard in React.",
    area: "experience",
    org: "Acme",
    source: "cv",
    confirmedByJulian: "2026-10-01",
  },
  {
    id: "zustand-at-acme",
    label: "Redux to Zustand",
    text: "Moved Acme's state from Redux to Zustand.",
    area: "project",
    org: "Acme",
    source: "cv",
    confirmedByJulian: "2026-10-01",
  },
  {
    id: "typescript",
    label: "TypeScript",
    text: "Writes strict TypeScript.",
    area: "skill",
    source: "julian",
    confirmedByJulian: "2026-10-02",
  },
];

const tools = buildTools(claims);

/** Runs a tool the way the SDK would after validating the input. */
async function run<T extends Tool>(t: T, input: InferToolInput<T>): Promise<InferToolOutput<T>> {
  if (!t.execute) throw new Error("tool has no execute");
  const output = await t.execute(input, { toolCallId: "call-1", messages: [], context: {} });
  if (typeof output === "object" && output !== null && Symbol.asyncIterator in output) {
    throw new Error("tool streams its output");
  }
  return output as InferToolOutput<T>;
}

describe("list_topics", () => {
  it("counts claims per area and per org, in file order", async () => {
    expect(await run(tools.list_topics, {})).toEqual({
      areas: [
        { area: "experience", count: 1 },
        { area: "project", count: 1 },
        { area: "skill", count: 1 },
      ],
      orgs: [{ org: "Acme", count: 2 }],
    });
  });
});

describe("get_claims", () => {
  it("filters by area", async () => {
    const result = await run(tools.get_claims, { area: "skill" });
    expect(result.claims.map((claim) => claim.id)).toEqual(["typescript"]);
  });

  it("filters by org, ignoring case, in file order", async () => {
    const result = await run(tools.get_claims, { org: "acme" });
    expect(result.claims.map((claim) => claim.id)).toEqual(["react-at-acme", "zustand-at-acme"]);
  });

  it("filters by area and org together", async () => {
    const result = await run(tools.get_claims, { area: "project", org: "Acme" });
    expect(result.claims.map((claim) => claim.id)).toEqual(["zustand-at-acme"]);
  });

  it("returns every claim with no filter", async () => {
    const result = await run(tools.get_claims, {});
    expect(result.claims).toHaveLength(3);
  });

  it("returns an empty list for an unknown area or org", async () => {
    expect((await run(tools.get_claims, { area: "hobbies" })).claims).toEqual([]);
    expect((await run(tools.get_claims, { org: "Nowhere" })).claims).toEqual([]);
  });

  it("returns the public fields and never confirmedByJulian", async () => {
    const result = await run(tools.get_claims, {});
    expect(result.claims[0]).toEqual({
      id: "react-at-acme",
      label: "React",
      org: "Acme",
      source: "cv",
      area: "experience",
      text: "Built the Acme dashboard in React.",
    });
    expect(result.claims[2]).not.toHaveProperty("org");
    for (const claim of result.claims) expect(claim).not.toHaveProperty("confirmedByJulian");
  });
});

describe("search_claims", () => {
  it("matches any word in text, label or org, ignoring case", async () => {
    const byText = await run(tools.search_claims, { query: "DASHBOARD" });
    expect(byText.claims.map((claim) => claim.id)).toEqual(["react-at-acme"]);

    const byLabelOrText = await run(tools.search_claims, { query: "zustand typescript" });
    expect(byLabelOrText.claims.map((claim) => claim.id)).toEqual([
      "zustand-at-acme",
      "typescript",
    ]);

    const byOrg = await run(tools.search_claims, { query: "acme" });
    expect(byOrg.claims.map((claim) => claim.id)).toEqual(["react-at-acme", "zustand-at-acme"]);
  });

  it("returns an empty list when nothing matches", async () => {
    expect((await run(tools.search_claims, { query: "kubernetes" })).claims).toEqual([]);
  });

  it("never returns confirmedByJulian", async () => {
    const result = await run(tools.search_claims, { query: "acme" });
    for (const claim of result.claims) expect(claim).not.toHaveProperty("confirmedByJulian");
  });
});

describe("tool input", () => {
  it.each([{ area: "" }, { area: 3 }, { org: "x".repeat(101) }, { area: "skill", extra: true }])(
    "get_claims rejects %j",
    (input) => {
      expect(getClaimsInput.safeParse(input).success).toBe(false);
    },
  );

  it.each([{}, { query: "" }, { query: "   " }, { query: "x".repeat(101) }, { query: 42 }])(
    "search_claims rejects %j",
    (input) => {
      expect(searchClaimsInput.safeParse(input).success).toBe(false);
    },
  );
});
