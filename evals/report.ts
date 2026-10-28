/**
 * The verdict and the report of an eval run: pure functions over the runs'
 * records. The two thresholds and the cost cap live here, in one place.
 * Never lower one to make a run pass; changing one needs Julian's OK.
 */
import type { TokenUsage } from "../src/lib/bot/limits";
import type { CheckResult } from "./checks";
import type { JudgeOutcome } from "./judge";
import type { CalibrationResult } from "./judge-calibration";
import type { ToolCall } from "./run-case";

/** The share of all runs that must pass. Critical cases must pass every run. */
export const PASS_RATE = 0.9;

/**
 * A run stops starting new runs once its estimated cost passes this ($2.00),
 * the bot, the judge and the calibration together. Up to four runs already in
 * flight can still finish past it.
 */
export const COST_CAP_MICRO_USD = 2_000_000;

/** One run of one case, as the report and the JSON results keep it. */
export type RunRecord = {
  caseId: string;
  critical: boolean;
  run: number;
  /** "skipped" means the cost cap stopped the run before it started. */
  outcome: "passed" | "failed" | "skipped";
  checks: CheckResult[];
  text: string;
  toolCalls: ToolCall[];
  /** The bot's tokens, every turn included. */
  usage: TokenUsage;
  /** What the judge said, or why it couldn't; absent when there was no answer to judge. */
  judge: JudgeOutcome | undefined;
  botCostMicroUsd: number;
  judgeCostMicroUsd: number;
  /** The bot and the judge together. */
  costMicroUsd: number;
};

export type Summary = {
  pass: boolean;
  /** Why the run fails; empty when it passes. */
  reasons: string[];
  passed: number;
  ran: number;
  skipped: number;
  passRate: number;
  /** Each case's passed and total runs, by id. */
  cases: { caseId: string; critical: boolean; passed: number; ran: number }[];
  criticalFailures: string[];
  /** Runs the judge itself failed on, counted apart from the bot's failures. */
  judgeErrors: number;
  calibration: { passed: number; total: number; wrong: string[] };
  /** The bot's tokens across every run. */
  usage: TokenUsage;
  botCostMicroUsd: number;
  judgeCostMicroUsd: number;
  calibrationCostMicroUsd: number;
  /** Everything: the bot, the judge on the cases, and the calibration. */
  costMicroUsd: number;
};

const ZERO_USAGE: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

/** A run's record: it passes when every check does, the judge's included. */
export function toRecord(base: Omit<RunRecord, "outcome" | "costMicroUsd">): RunRecord {
  return {
    ...base,
    outcome: base.checks.every((check) => check.pass) ? "passed" : "failed",
    costMicroUsd: base.botCostMicroUsd + base.judgeCostMicroUsd,
  };
}

/** The record of a run the cost cap stopped before it started. */
export function skippedRecord(caseId: string, critical: boolean, run: number): RunRecord {
  return {
    caseId,
    critical,
    run,
    outcome: "skipped",
    checks: [],
    text: "",
    toolCalls: [],
    usage: { ...ZERO_USAGE },
    judge: undefined,
    botCostMicroUsd: 0,
    judgeCostMicroUsd: 0,
    costMicroUsd: 0,
  };
}

/**
 * The verdict: the judge got every calibration item right, every critical case
 * passes every run, at least PASS_RATE of all runs pass, and the cost cap
 * stopped nothing.
 */
export function summarize(
  records: readonly RunRecord[],
  calibration: readonly CalibrationResult[] = [],
): Summary {
  const ran = records.filter((record) => record.outcome !== "skipped");
  const passed = ran.filter((record) => record.outcome === "passed").length;
  const skipped = records.length - ran.length;
  const passRate = ran.length === 0 ? 0 : passed / ran.length;

  const byCase = new Map<string, Summary["cases"][number]>();
  for (const record of ran) {
    const entry = byCase.get(record.caseId) ?? {
      caseId: record.caseId,
      critical: record.critical,
      passed: 0,
      ran: 0,
    };
    entry.ran += 1;
    if (record.outcome === "passed") entry.passed += 1;
    byCase.set(record.caseId, entry);
  }
  const cases = [...byCase.values()].sort((a, b) => a.caseId.localeCompare(b.caseId));
  const criticalFailures = cases
    .filter((entry) => entry.critical && entry.passed < entry.ran)
    .map((entry) => entry.caseId);

  const usage = { ...ZERO_USAGE };
  let botCostMicroUsd = 0;
  let judgeCostMicroUsd = 0;
  for (const record of records) {
    usage.input += record.usage.input;
    usage.output += record.usage.output;
    usage.cacheRead += record.usage.cacheRead;
    usage.cacheWrite += record.usage.cacheWrite;
    botCostMicroUsd += record.botCostMicroUsd;
    judgeCostMicroUsd += record.judgeCostMicroUsd;
  }
  const calibrationCostMicroUsd = calibration.reduce((sum, item) => sum + item.costMicroUsd, 0);
  const wrong = calibration.filter((item) => !item.pass).map((item) => item.id);
  const judgeErrors = ran.filter((record) =>
    record.checks.some((check) => check.name === "judge-error" && !check.pass),
  ).length;

  const reasons: string[] = [];
  if (wrong.length > 0) reasons.push(`the judge got calibration items wrong: ${wrong.join(", ")}`);
  if (ran.length === 0) reasons.push("no case ran");
  if (criticalFailures.length > 0) {
    reasons.push(`critical cases failed: ${criticalFailures.join(", ")}`);
  }
  if (ran.length > 0 && passRate < PASS_RATE) {
    reasons.push(`${percent(passRate)} of runs passed, below ${percent(PASS_RATE)}`);
  }
  if (skipped > 0) {
    reasons.push(
      `the cost cap of ${dollars(COST_CAP_MICRO_USD)} stopped ${skipped} run${skipped === 1 ? "" : "s"}`,
    );
  }

  return {
    pass: reasons.length === 0,
    reasons,
    passed,
    ran: ran.length,
    skipped,
    passRate,
    cases,
    criticalFailures,
    judgeErrors,
    calibration: {
      passed: calibration.length - wrong.length,
      total: calibration.length,
      wrong,
    },
    usage,
    botCostMicroUsd,
    judgeCostMicroUsd,
    calibrationCostMicroUsd,
    costMicroUsd: botCostMicroUsd + judgeCostMicroUsd + calibrationCostMicroUsd,
  };
}

function percent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

/** Micro-dollars as dollars, to the hundredth of a cent. */
function dollars(microUsd: number): string {
  return `$${(microUsd / 1_000_000).toFixed(4)}`;
}

/** The calibration's lines: the score, the cost, and each wrong item with what the judge said. */
export function formatCalibration(calibration: readonly CalibrationResult[]): string {
  const wrong = calibration.filter((item) => !item.pass);
  const cost = calibration.reduce((sum, item) => sum + item.costMicroUsd, 0);
  return [
    `Calibration: ${calibration.length - wrong.length}/${calibration.length} right (${dollars(cost)})`,
    ...wrong.map((item) => `    WRONG ${item.id}: ${item.reason}`),
  ].join("\n");
}

/**
 * The text report: one line per case and run, the failed checks' reasons and
 * the answer for a failure, then each case's pass rate and the summary.
 */
export function formatReport(
  summary: Summary,
  records: readonly RunRecord[],
  model: string,
): string {
  const lines: string[] = [];
  const sorted = [...records].sort((a, b) => a.caseId.localeCompare(b.caseId) || a.run - b.run);
  for (const record of sorted) {
    const label = `${record.caseId}${record.critical ? " (critical)" : ""} #${record.run}`;
    if (record.outcome === "skipped") {
      lines.push(`SKIP ${label}: stopped by the cost cap`);
      continue;
    }
    lines.push(
      `${record.outcome === "passed" ? "PASS" : "FAIL"} ${label} (${dollars(record.costMicroUsd)})`,
    );
    if (record.outcome === "failed") {
      for (const check of record.checks.filter((check) => !check.pass)) {
        lines.push(`    ${check.name}: ${check.reason}`);
      }
      lines.push(`    answer: ${record.text.trim() || "(empty)"}`);
    }
  }

  lines.push("", "Pass rate by case:");
  for (const entry of summary.cases) {
    lines.push(`  ${entry.caseId}: ${entry.passed}/${entry.ran}`);
  }

  const { input, output, cacheRead, cacheWrite } = summary.usage;
  lines.push(
    "",
    `Model: ${model}`,
    `Calibration: ${summary.calibration.passed}/${summary.calibration.total} right`,
    `Passed: ${summary.passed}/${summary.ran} runs (${percent(summary.passRate)})`,
    `Critical failures: ${summary.criticalFailures.length === 0 ? "none" : summary.criticalFailures.join(", ")}`,
    `Judge errors: ${summary.judgeErrors} run${summary.judgeErrors === 1 ? "" : "s"}`,
    `Bot tokens: ${input} input, ${output} output, ${cacheRead} cache read, ${cacheWrite} cache write`,
    `Estimated cost: ${dollars(summary.costMicroUsd)} (bot ${dollars(summary.botCostMicroUsd)}, judge ${dollars(summary.judgeCostMicroUsd)}, calibration ${dollars(summary.calibrationCostMicroUsd)})`,
    summary.pass ? "Result: PASS" : `Result: FAIL (${summary.reasons.join("; ")})`,
  );
  return lines.join("\n");
}
