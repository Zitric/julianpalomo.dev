import { describe, expect, it } from "vitest";
import {
  COST_CAP_MICRO_USD,
  formatReport,
  PASS_RATE,
  type RunRecord,
  skippedRecord,
  summarize,
  toRecord,
} from "../../evals/report";

const usage = { input: 1_000, output: 200, cacheRead: 3_000, cacheWrite: 0 };

function run(caseId: string, pass: boolean, options: { critical?: boolean; run?: number } = {}) {
  return toRecord({
    caseId,
    critical: options.critical ?? false,
    run: options.run ?? 1,
    checks: [{ name: "outcome", pass, reason: pass ? "ok" : "answered without a valid citation" }],
    text: pass ? "A cited answer. [[cazoo-role]]" : "An uncited answer.",
    toolCalls: [],
    usage,
    costMicroUsd: 230,
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
    expect(report).toContain("Estimated cost: $0.0005");
    expect(report).toContain("Result: FAIL");
  });
});
