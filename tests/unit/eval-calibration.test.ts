import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { JudgeInput, JudgeOutcome, Verdict } from "../../evals/judge";
import {
  CALIBRATION_ITEMS,
  type CalibrationItem,
  calibrationClaims,
  calibrationResult,
  runCalibration,
} from "../../evals/judge-calibration";

const zero = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

const item: CalibrationItem = {
  id: "oms-lead-managed",
  claimIds: ["oms-lead"],
  sentence: "Julian managed a team of four developers at Orders Made Simple.",
  language: "en",
  expected: "overstated",
};

function judged(verdicts: Verdict[], costMicroUsd = 0): JudgeOutcome {
  return {
    status: "judged",
    verdict: {
      sentences: verdicts.map((verdict) => ({
        sentence: "A sentence.",
        verdict,
        claimIds: [],
        reason: "A reason.",
      })),
      language: { matches: true, reason: "English." },
      rubric: { met: true, reason: "Met." },
    },
    usage: zero,
    costMicroUsd,
  };
}

describe("calibrationResult", () => {
  it("passes when every sentence has the expected verdict", () => {
    expect(calibrationResult(item, judged(["overstated", "overstated"], 900))).toEqual({
      id: "oms-lead-managed",
      pass: true,
      expected: "overstated",
      verdicts: ["overstated", "overstated"],
      sentences: [
        { sentence: "A sentence.", verdict: "overstated", reason: "A reason." },
        { sentence: "A sentence.", verdict: "overstated", reason: "A reason." },
      ],
      reason: "",
      costMicroUsd: 900,
    });
  });

  it("fails when any sentence has another verdict", () => {
    const result = calibrationResult(item, judged(["overstated", "supported"]));
    expect(result).toMatchObject({
      pass: false,
      reason: "expected overstated, got overstated, supported",
    });
  });

  it("fails when the judge returns no sentences at all", () => {
    expect(calibrationResult(item, judged([]))).toMatchObject({
      pass: false,
      verdicts: [],
      reason: "the judge returned no sentences",
    });
  });

  it("fails a judge error as judge-error, and keeps its cost", () => {
    const failed: JudgeOutcome = {
      status: "error",
      error: "blocked",
      usage: zero,
      costMicroUsd: 40,
    };
    expect(calibrationResult(item, failed)).toMatchObject({
      pass: false,
      reason: "judge-error: blocked",
      costMicroUsd: 40,
    });
  });
});

describe("calibrationResult with a provider error", () => {
  it("fails the item with the kind, so the run is inconclusive instead of the judge wrong", () => {
    const result = calibrationResult(item, {
      status: "provider-error",
      providerError: "credit",
      usage: zero,
      costMicroUsd: 0,
    });
    expect(result).toMatchObject({
      pass: false,
      providerError: "credit",
      reason: "provider error: credit",
    });
  });
});

describe("CALIBRATION_ITEMS", () => {
  it("has unique ids and builds every item on confirmed claims", () => {
    expect(new Set(CALIBRATION_ITEMS.map((entry) => entry.id)).size).toBe(CALIBRATION_ITEMS.length);
    for (const entry of CALIBRATION_ITEMS) {
      expect(calibrationClaims(entry).map((claim) => claim.id)).toEqual(entry.claimIds);
    }
  });

  it("rejects an item whose claim isn't confirmed", () => {
    expect(() => calibrationClaims({ ...item, claimIds: ["made-up"] })).toThrow(
      "made-up is not a confirmed claim",
    );
  });
});

describe("runCalibration", () => {
  it("judges every item with its sentence, citation and claim texts, in order", async () => {
    const inputs: JudgeInput[] = [];
    const results = await runCalibration(new MockLanguageModelV4(), async (input) => {
      inputs.push(input);
      return judged(["overstated"]);
    });

    expect(results.map((result) => result.id)).toEqual(CALIBRATION_ITEMS.map((entry) => entry.id));
    const managed = inputs.find((input) => input.answer.startsWith("Julian managed"));
    expect(managed?.answer).toBe(`${item.sentence} [[oms-lead]]`);
    expect(managed?.claims[0]?.text).toContain("Technical lead in a team of 4 developers");
    expect(managed?.question).toBeUndefined();
    const premise = inputs.find((input) => input.answer.startsWith("Sí, fue"));
    expect(premise?.question).toBe("¿Julian era el jefe del equipo en Orders Made Simple?");
    const none = inputs.find((input) => input.claims.length === 0);
    expect(none?.answer).toBe("The claims don't cover that; you can ask Julian on LinkedIn.");
  });
});
