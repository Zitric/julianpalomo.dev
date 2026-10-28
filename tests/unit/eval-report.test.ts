import { describe, expect, it } from "vitest";
import {
  COST_CAP_MICRO_USD,
  formatCalibration,
  formatReport,
  PASS_RATE,
  type RunRecord,
  skippedRecord,
  summarize,
  toRecord,
} from "../../evals/report";

const usage = { input: 1_000, output: 200, cacheRead: 3_000, cacheWrite: 0 };

function run(
  caseId: string,
  pass: boolean,
  options: { critical?: boolean; run?: number; judgeCost?: number } = {},
) {
  return toRecord({
    caseId,
    critical: options.critical ?? false,
    run: options.run ?? 1,
    checks: [{ name: "outcome", pass, reason: pass ? "ok" : "answered without a valid citation" }],
    text: pass ? "A cited answer. [[cazoo-role]]" : "An uncited answer.",
    toolCalls: [],
    usage,
    judge: undefined,
    botCostMicroUsd: 230,
    judgeCostMicroUsd: options.judgeCost ?? 0,
  });
}

/** `passed` passing runs and `failed` failing ones, each its own case. */
function runs(passed: number, failed: number): RunRecord[] {
  return [
    ...Array.from({ length: passed }, (_, i) => run(`pass-${i}`, true)),
    ...Array.from({ length: failed }, (_, i) => run(`fail-${i}`, false)),
  ];
}

describe("summarize", () => {
  it("passes when every critical case passes and enough runs pass", () => {
    const summary = summarize([...runs(9, 1), run("critical", true, { critical: true })]);
    expect(summary).toMatchObject({ pass: true, passed: 10, ran: 11, reasons: [] });
  });

  it("fails when a critical case fails a single run", () => {
    const summary = summarize([
      ...runs(20, 0),
      run("phone-number", true, { critical: true, run: 1 }),
      run("phone-number", false, { critical: true, run: 2 }),
    ]);
    expect(summary.pass).toBe(false);
    expect(summary.criticalFailures).toEqual(["phone-number"]);
  });

  it(`fails below ${PASS_RATE * 100}% of runs passing, and passes at it`, () => {
    expect(summarize(runs(8, 2)).pass).toBe(false);
    expect(summarize(runs(9, 1)).pass).toBe(true);
  });

  it("gives each case its pass rate across repeats", () => {
    const summary = summarize([
      run("cazoo-es", true, { run: 1 }),
      run("cazoo-es", false, { run: 2 }),
      run("cazoo-es", true, { run: 3 }),
    ]);
    expect(summary.cases).toEqual([{ caseId: "cazoo-es", critical: false, passed: 2, ran: 3 }]);
  });

  it("adds up the tokens and the cost of every run", () => {
    const summary = summarize(runs(2, 1));
    expect(summary.usage).toEqual({ input: 3_000, output: 600, cacheRead: 9_000, cacheWrite: 0 });
    expect(summary.costMicroUsd).toBe(690);
  });

  it("fails a run the cost cap stopped, and doesn't count its skipped runs", () => {
    const summary = summarize([...runs(3, 0), skippedRecord("python-years", false, 1)]);
    expect(summary).toMatchObject({ pass: false, ran: 3, skipped: 1, passRate: 1 });
    expect(summary.reasons).toEqual([
      `the cost cap of $${COST_CAP_MICRO_USD / 1_000_000}.0000 stopped 1 run`,
    ]);
  });

  it("fails a run in which no case ran", () => {
    expect(summarize([skippedRecord("python-years", false, 1)]).reasons).toContain("no case ran");
  });
});

describe("summarize with the judge", () => {
  const calibration = [
    {
      id: "a",
      pass: true,
      expected: "overstated" as const,
      verdicts: [],
      reason: "",
      costMicroUsd: 1_000,
    },
    {
      id: "b",
      pass: true,
      expected: "supported" as const,
      verdicts: [],
      reason: "",
      costMicroUsd: 2_000,
    },
  ];

  it("splits the cost into the bot, the judge and the calibration, and adds them up", () => {
    const summary = summarize([run("a-case", true, { judgeCost: 5_000 })], calibration);
    expect(summary).toMatchObject({
      botCostMicroUsd: 230,
      judgeCostMicroUsd: 5_000,
      calibrationCostMicroUsd: 3_000,
      costMicroUsd: 8_230,
      calibration: { passed: 2, total: 2, wrong: [] },
    });
  });

  it("fails when a calibration item is wrong", () => {
    const wrong = [{ ...calibration[0], id: "a", pass: false, reason: "expected overstated" }];
    const summary = summarize(runs(10, 0), wrong as typeof calibration);
    expect(summary.pass).toBe(false);
    expect(summary.reasons).toContain("the judge got calibration items wrong: a");
  });

  it("counts the runs the judge itself failed on, apart from the bot's failures", () => {
    const judgeFailed = toRecord({
      ...run("a-case", true),
      checks: [{ name: "judge-error", pass: false, reason: "blocked" }],
    });
    const summary = summarize([judgeFailed, run("other", false)]);
    expect(summary.judgeErrors).toBe(1);
    expect(formatReport(summary, [judgeFailed], "bot")).toContain("    judge-error: blocked");
  });
});

describe("formatCalibration", () => {
  it("gives the score and the cost, and lists each wrong item", () => {
    const text = formatCalibration([
      {
        id: "a",
        pass: true,
        expected: "supported",
        verdicts: ["supported"],
        reason: "",
        costMicroUsd: 4_000,
      },
      {
        id: "b",
        pass: false,
        expected: "overstated",
        verdicts: ["supported"],
        reason: "expected overstated, got supported",
        costMicroUsd: 6_000,
      },
    ]);
    expect(text).toBe(
      "Calibration: 1/2 right ($0.0100)\n    WRONG b: expected overstated, got supported",
    );
  });
});

describe("formatReport", () => {
  it("lists each run, a failure's reasons and answer, and the totals", () => {
    const records = [run("cazoo-overview", true), run("python-years", false)];
    const report = formatReport(summarize(records), records, "claude-haiku-5-5");
    expect(report).toContain("PASS cazoo-overview #1 ($0.0002)");
    expect(report).toContain("FAIL python-years #1");
    expect(report).toContain("    outcome: answered without a valid citation");
    expect(report).toContain("    answer: An uncited answer.");
    expect(report).toContain("Model: claude-haiku-5-5");
    expect(report).toContain("Passed: 1/2 runs (50%)");
    expect(report).toContain(
      "Estimated cost: $0.0005 (bot $0.0005, judge $0.0000, calibration $0.0000)",
    );
    expect(report).toContain("Result: FAIL");
  });
});
