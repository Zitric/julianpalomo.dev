/**
 * The verdict and the report of an eval run: pure functions over the runs'
 * records. The two thresholds and the cost cap live here, in one place.
 * Never lower one to make a run pass; changing one needs Julian's OK.
 */
import type { TokenUsage } from "../src/lib/bot/limits";
import type { CheckResult } from "./checks";
import type { JudgeOutcome } from "./judge";
import type { CalibrationResult } from "./judge-calibration";
import { PROVIDER_ERROR_KINDS, type ProviderErrorKind } from "./provider-errors";
import type { ToolCall } from "./run-case";

/** The share of all runs that must pass. Critical cases must pass every run. */
export const PASS_RATE = 0.9;

/**
 * Whether a pass rate below PASS_RATE fails the run ("enforced") or only
 * warns ("reported"). CI reports it: one repeat of a baseline at the threshold
 * lands on either side of it from noise alone
 * (docs/adr/2026-10-28-evals-in-ci.md). Every other reason still fails.
 */
export type PassRatePolicy = "enforced" | "reported";

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
  /**
   * "skipped" means the cost cap stopped the run before it started;
   * "provider-error" that the model API failed, so the run is neither passed nor failed.
   */
  outcome: "passed" | "failed" | "skipped" | "provider-error";
  /** The kind of provider error, only for a "provider-error" run. */
  providerError: ProviderErrorKind | undefined;
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
  /** Inconclusive when any run or calibration item hit a provider error, whatever the rest did. */
  verdict: "pass" | "fail" | "inconclusive";
  /** Why the run fails or is inconclusive, the provider errors first; empty when it passes. */
  reasons: string[];
  /** What is reported without failing the run: a low pass rate under the "reported" policy. */
  warnings: string[];
  passed: number;
  /** Runs that passed or failed: never the skipped ones or the provider errors. */
  ran: number;
  skipped: number;
  passRate: number;
  /** Each case's passed and total runs, by id. */
  cases: { caseId: string; critical: boolean; passed: number; ran: number }[];
  criticalFailures: string[];
  /** Runs the judge itself failed on, counted apart from the bot's failures. */
  judgeErrors: number;
  /** Runs and calibration items that hit provider errors, and each kind once. */
  providerErrors: { runs: number; calibrationItems: number; kinds: ProviderErrorKind[] };
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

/**
 * A run's record: it passes when every check does, the judge's included. A
 * provider error, the bot's or the judge's, makes it "provider-error" whatever
 * the checks say.
 */
export function toRecord(
  base: Omit<RunRecord, "outcome" | "costMicroUsd" | "providerError"> & {
    providerError?: ProviderErrorKind | undefined;
  },
): RunRecord {
  const providerError = base.providerError;
  return {
    ...base,
    outcome:
      providerError !== undefined
        ? "provider-error"
        : base.checks.every((check) => check.pass)
          ? "passed"
          : "failed",
    providerError,
    costMicroUsd: base.botCostMicroUsd + base.judgeCostMicroUsd,
  };
}

/** Each provider error kind among `entries` once, in PROVIDER_ERROR_KINDS order. */
function kindsOf(
  entries: readonly { providerError?: ProviderErrorKind | undefined }[],
): ProviderErrorKind[] {
  return PROVIDER_ERROR_KINDS.filter((kind) =>
    entries.some((entry) => entry.providerError === kind),
  );
}

/** "N runs hit provider errors: credit, overload". */
function providerErrorReason(
  count: number,
  unit: "run" | "calibration item",
  kinds: readonly ProviderErrorKind[],
): string {
  const subject =
    count === 1 ? `1 ${unit} hit a provider error` : `${count} ${unit}s hit provider errors`;
  return `${subject}: ${kinds.join(", ")}`;
}

/** The record of a run the cost cap stopped before it started. */
export function skippedRecord(caseId: string, critical: boolean, run: number): RunRecord {
  return {
    caseId,
    critical,
    run,
    outcome: "skipped",
    providerError: undefined,
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
 * passes every run, at least PASS_RATE of all runs pass (unless the pass rate
 * is only reported, as a warning), and the cost cap stopped nothing. Any
 * provider error makes it inconclusive instead: such a run or item says
 * nothing about the bot or the judge, so it counts neither in the pass rate
 * nor toward the critical cases, and the run can't pass without it.
 */
export function summarize(
  records: readonly RunRecord[],
  calibration: readonly CalibrationResult[] = [],
  options: { passRate?: PassRatePolicy } = {},
): Summary {
  const ran = records.filter(
    (record) => record.outcome === "passed" || record.outcome === "failed",
  );
  const passed = ran.filter((record) => record.outcome === "passed").length;
  const skipped = records.filter((record) => record.outcome === "skipped").length;
  const providerRuns = records.filter((record) => record.providerError !== undefined);
  const providerItems = calibration.filter((item) => item.providerError !== undefined);
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
  const wrong = calibration
    .filter((item) => !item.pass && item.providerError === undefined)
    .map((item) => item.id);
  const runKinds = kindsOf(providerRuns);
  const itemKinds = kindsOf(providerItems);
  const kinds = PROVIDER_ERROR_KINDS.filter(
    (kind) => runKinds.includes(kind) || itemKinds.includes(kind),
  );
  const judgeErrors = ran.filter((record) =>
    record.checks.some((check) => check.name === "judge-error" && !check.pass),
  ).length;

  const reasons: string[] = [];
  if (providerItems.length > 0) {
    reasons.push(providerErrorReason(providerItems.length, "calibration item", itemKinds));
  }
  if (providerRuns.length > 0) {
    reasons.push(providerErrorReason(providerRuns.length, "run", runKinds));
  }
  const inconclusive = reasons.length > 0;
  if (wrong.length > 0) reasons.push(`the judge got calibration items wrong: ${wrong.join(", ")}`);
  if (ran.length === 0 && !inconclusive) reasons.push("no case ran");
  if (criticalFailures.length > 0) {
    reasons.push(`critical cases failed: ${criticalFailures.join(", ")}`);
  }
  const warnings: string[] = [];
  if (ran.length > 0 && passRate < PASS_RATE) {
    const low = `${percent(passRate)} of runs passed, below ${percent(PASS_RATE)}`;
    if ((options.passRate ?? "enforced") === "enforced") reasons.push(low);
    else warnings.push(`${low}: reported, not enforced`);
  }
  if (skipped > 0) {
    reasons.push(
      `the cost cap of ${dollars(COST_CAP_MICRO_USD)} stopped ${skipped} run${skipped === 1 ? "" : "s"}`,
    );
  }

  return {
    verdict: inconclusive ? "inconclusive" : reasons.length > 0 ? "fail" : "pass",
    reasons,
    warnings,
    passed,
    ran: ran.length,
    skipped,
    passRate,
    cases,
    criticalFailures,
    judgeErrors,
    providerErrors: {
      runs: providerRuns.length,
      calibrationItems: providerItems.length,
      kinds,
    },
    calibration: {
      passed: calibration.filter((item) => item.pass).length,
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

function providerErrorLine({ runs, calibrationItems, kinds }: Summary["providerErrors"]): string {
  if (runs === 0 && calibrationItems === 0) return "none";
  const counts = [`${runs} run${runs === 1 ? "" : "s"}`];
  if (calibrationItems > 0) {
    counts.push(`${calibrationItems} calibration item${calibrationItems === 1 ? "" : "s"}`);
  }
  return `${counts.join(", ")} (${kinds.join(", ")})`;
}

function resultLine(summary: Summary): string {
  switch (summary.verdict) {
    case "pass":
      return "Result: PASS";
    case "fail":
      return `Result: FAIL (${summary.reasons.join("; ")})`;
    case "inconclusive":
      return `Result: INCONCLUSIVE (${summary.reasons.join("; ")})`;
    default: {
      const unhandled: never = summary.verdict;
      throw new Error(String(unhandled));
    }
  }
}

function percent(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

/** Micro-dollars as dollars, to the hundredth of a cent. */
function dollars(microUsd: number): string {
  return `$${(microUsd / 1_000_000).toFixed(4)}`;
}

/**
 * The calibration's lines: the score, the cost, each wrong item with what the
 * judge said, and each item a provider error stopped, with its kind.
 */
export function formatCalibration(calibration: readonly CalibrationResult[]): string {
  const right = calibration.filter((item) => item.pass).length;
  const cost = calibration.reduce((sum, item) => sum + item.costMicroUsd, 0);
  return [
    `Calibration: ${right}/${calibration.length} right (${dollars(cost)})`,
    ...calibration.flatMap((item) => {
      if (item.pass) return [];
      return item.providerError === undefined
        ? [`    WRONG ${item.id}: ${item.reason}`]
        : [`    PERR ${item.id}: provider error (${item.providerError})`];
    }),
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
    if (record.providerError !== undefined) {
      lines.push(`PERR ${label}: provider error (${record.providerError})`);
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
    `Provider errors: ${providerErrorLine(summary.providerErrors)}`,
    `Bot tokens: ${input} input, ${output} output, ${cacheRead} cache read, ${cacheWrite} cache write`,
    `Estimated cost: ${dollars(summary.costMicroUsd)} (bot ${dollars(summary.botCostMicroUsd)}, judge ${dollars(summary.judgeCostMicroUsd)}, calibration ${dollars(summary.calibrationCostMicroUsd)})`,
    ...summary.warnings.map((warning) => `Warning: ${warning}`),
    resultLine(summary),
  );
  return lines.join("\n");
}

/**
 * The run's summary as Markdown, for GitHub's job summary page: the result and
 * why, the warnings, the score, the critical failures, the calibration, the
 * provider errors, the cost, and each failed run by case and number. The
 * answers stay in the JSON results.
 */
export function formatJobSummary(
  summary: Summary,
  records: readonly RunRecord[],
  model: string,
): string {
  const failed = records
    .filter((record) => record.outcome === "failed")
    .sort((a, b) => a.caseId.localeCompare(b.caseId) || a.run - b.run)
    .map((record) => `\`${record.caseId}\` #${record.run}${record.critical ? " (critical)" : ""}`);
  const lines = [
    `## Evals: ${summary.verdict.toUpperCase()}`,
    "",
    ...summary.reasons.map((reason) => `- ${reason}`),
    ...summary.warnings.map((warning) => `- Warning: ${warning}`),
    ...(summary.reasons.length + summary.warnings.length > 0 ? [""] : []),
    "| | |",
    "| --- | --- |",
    `| Model | ${model} |`,
    `| Passed | ${summary.passed}/${summary.ran} runs (${percent(summary.passRate)}) |`,
    `| Critical failures | ${summary.criticalFailures.length === 0 ? "none" : summary.criticalFailures.join(", ")} |`,
    `| Calibration | ${summary.calibration.passed}/${summary.calibration.total} right |`,
    `| Judge errors | ${summary.judgeErrors} |`,
    `| Provider errors | ${providerErrorLine(summary.providerErrors)} |`,
    `| Estimated cost | ${dollars(summary.costMicroUsd)} (bot ${dollars(summary.botCostMicroUsd)}, judge ${dollars(summary.judgeCostMicroUsd)}, calibration ${dollars(summary.calibrationCostMicroUsd)}) |`,
  ];
  if (failed.length > 0) lines.push("", `Failed runs: ${failed.join(", ")}`);
  return `${lines.join("\n")}\n`;
}
