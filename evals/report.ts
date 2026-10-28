/**
 * The verdict and the report of an eval run: pure functions over the runs'
 * records. The two thresholds and the cost cap live here, in one place.
 * Never lower one to make a run pass; changing one needs Julian's OK.
 */
import type { TokenUsage } from "../src/lib/bot/limits";
import type { CheckResult } from "./checks";
import type { ToolCall } from "./run-case";

/** The share of all runs that must pass. Critical cases must pass every run. */
export const PASS_RATE = 0.9;

/** A run stops starting new runs once its estimated cost passes this ($2.00). */
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
  usage: TokenUsage;
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
  usage: TokenUsage;
  costMicroUsd: number;
};

const ZERO_USAGE: TokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

/** A run's record: it passes when every check does. */
export function toRecord(base: Omit<RunRecord, "outcome">): RunRecord {
  return { ...base, outcome: base.checks.every((check) => check.pass) ? "passed" : "failed" };
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
    costMicroUsd: 0,
  };
}

/**
 * The verdict: every critical case passes every run, at least PASS_RATE of
 * all runs pass, and the cost cap stopped nothing.
 */
export function summarize(records: readonly RunRecord[]): Summary {
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
  let costMicroUsd = 0;
  for (const record of records) {
    usage.input += record.usage.input;
    usage.output += record.usage.output;
    usage.cacheRead += record.usage.cacheRead;
    usage.cacheWrite += record.usage.cacheWrite;
    costMicroUsd += record.costMicroUsd;
  }

  const reasons: string[] = [];
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
    usage,
    costMicroUsd,
  };
}

function percent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

/** Micro-dollars as dollars, to the hundredth of a cent. */
function dollars(microUsd: number): string {
  return `$${(microUsd / 1_000_000).toFixed(4)}`;
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
    `Passed: ${summary.passed}/${summary.ran} runs (${percent(summary.passRate)})`,
    `Critical failures: ${summary.criticalFailures.length === 0 ? "none" : summary.criticalFailures.join(", ")}`,
    `Tokens: ${input} input, ${output} output, ${cacheRead} cache read, ${cacheWrite} cache write`,
    `Estimated cost: ${dollars(summary.costMicroUsd)}`,
    summary.pass ? "Result: PASS" : `Result: FAIL (${summary.reasons.join("; ")})`,
  );
  return lines.join("\n");
}
