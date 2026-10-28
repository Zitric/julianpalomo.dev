/**
 * The eval run: the judge's calibration first, then every case against the
 * real model, each answer graded by the code checks and then by the judge,
 * then the report. Run it with `pnpm eval`, one case with
 * `pnpm eval -t <case-id>`, or only the calibration with
 * `EVAL_CALIBRATION_ONLY=1 pnpm eval`; it costs money.
 *
 * A wrong calibration item fails beforeAll, so no case runs. The per-case
 * tests never fail on their own: the run's verdict comes from the thresholds
 * in report.ts, and afterAll fails the command when they aren't met. A
 * provider error, in the calibration or in any run, makes the run
 * inconclusive (provider-errors.ts): the command fails, and never passes.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { inspect } from "node:util";
import { createAnthropic } from "@ai-sdk/anthropic";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { z } from "zod";
import { MODEL_ID } from "../src/lib/bot/model";
import { loadCases } from "./cases";
import { checkAnswer } from "./checks";
import {
  claimsFromToolCalls,
  JUDGE_MODEL_ID,
  type JudgeOutcome,
  judgeAnswer,
  judgeChecks,
} from "./judge";
import { type CalibrationResult, runCalibration } from "./judge-calibration";
import { providerErrorKind } from "./provider-errors";
import {
  COST_CAP_MICRO_USD,
  formatCalibration,
  formatReport,
  type RunRecord,
  skippedRecord,
  summarize,
  toRecord,
} from "./report";
import { runCase } from "./run-case";

const DEV_VARS = ".dev.vars";
const RESULTS_DIR = "evals/results";
/** The longest one run of one case may take, all its turns and the judge included. */
const RUN_TIMEOUT_MS = 180_000;
/** The longest the whole calibration may take. */
const CALIBRATION_TIMEOUT_MS = 600_000;

if (process.env.ANTHROPIC_API_KEY === undefined && existsSync(DEV_VARS)) {
  process.loadEnvFile(DEV_VARS);
}
const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
if (!apiKey) {
  throw new Error(
    `pnpm eval calls the real model and needs ANTHROPIC_API_KEY, in ${DEV_VARS} or the environment.`,
  );
}

/** The key never reaches the output or the results file, whatever logs it. */
function redact(text: string): string {
  return apiKey ? text.replaceAll(apiKey, "[redacted]") : text;
}
for (const level of ["log", "info", "warn", "error"] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]) =>
    original(...args.map((arg) => redact(typeof arg === "string" ? arg : inspect(arg))));
}

const repeat = z.coerce.number().int().min(1).default(1).parse(process.env.EVAL_REPEAT);
const calibrationOnly = process.env.EVAL_CALIBRATION_ONLY === "1";
const judgeModel = createAnthropic({ apiKey })(JUDGE_MODEL_ID);
const records: RunRecord[] = [];
let calibration: CalibrationResult[] = [];
let spentMicroUsd = 0;

beforeAll(async () => {
  calibration = await runCalibration(judgeModel);
  spentMicroUsd += calibration.reduce((sum, item) => sum + item.costMicroUsd, 0);
  process.stdout.write(`\n${redact(formatCalibration(calibration))}\n`);
  const verdict = summarize([], calibration);
  if (verdict.providerErrors.calibrationItems > 0) {
    throw new Error(`the eval run is inconclusive: ${verdict.reasons[0]}`);
  }
  const wrong = calibration.filter((item) => !item.pass);
  if (wrong.length > 0) {
    throw new Error(
      `the judge got ${wrong.length} calibration item${wrong.length === 1 ? "" : "s"} wrong, so no case runs: fix the judge's prompt, never the items`,
    );
  }
}, CALIBRATION_TIMEOUT_MS);

// Always defined, so a calibration-only run has a test and the calibration shows in Vitest's list.
test("calibration", () => {
  expect(calibration.filter((item) => !item.pass)).toEqual([]);
});

/** The judge's verdict on one run, or undefined when there is no answer to judge. */
async function judge(
  evalCase: ReturnType<typeof loadCases>[number],
  result: Awaited<ReturnType<typeof runCase>>,
): Promise<JudgeOutcome | undefined> {
  if (result.status !== 200 || result.text.trim().length === 0) return undefined;
  const question = evalCase.turns.at(-1);
  return judgeAnswer(
    {
      earlierTurns: result.earlierTurns,
      question: typeof question === "string" ? question : undefined,
      answer: result.text,
      claims: claimsFromToolCalls(result.toolCalls),
      language: evalCase.language,
      rubric: evalCase.rubric,
    },
    judgeModel,
  );
}

(calibrationOnly ? describe.skip : describe.concurrent)("cases", () => {
  for (const evalCase of loadCases()) {
    test(
      evalCase.id,
      async () => {
        for (let run = 1; run <= repeat; run++) {
          if (spentMicroUsd > COST_CAP_MICRO_USD) {
            records.push(skippedRecord(evalCase.id, evalCase.critical, run));
            continue;
          }
          const base = { caseId: evalCase.id, critical: evalCase.critical, run };
          try {
            const result = await runCase(evalCase, apiKey);
            spentMicroUsd += result.costMicroUsd;
            // A broken answer isn't worth judging: the run is a provider error either way.
            const verdict =
              result.providerError === undefined ? await judge(evalCase, result) : undefined;
            spentMicroUsd += verdict?.costMicroUsd ?? 0;
            const providerError =
              result.providerError ??
              (verdict?.status === "error" ? verdict.providerError : undefined);
            records.push(
              toRecord({
                ...base,
                providerError,
                checks:
                  providerError !== undefined
                    ? []
                    : [
                        ...checkAnswer(result, evalCase.expect),
                        ...(verdict === undefined ? [] : judgeChecks(verdict)),
                      ],
                text: result.text,
                toolCalls: result.toolCalls,
                usage: result.usage,
                judge: verdict,
                botCostMicroUsd: result.costMicroUsd,
                judgeCostMicroUsd: verdict?.costMicroUsd ?? 0,
              }),
            );
          } catch (error) {
            // A runner failure is a failed run with its reason, not a crash of the whole run.
            const providerError = providerErrorKind(error);
            const reason =
              providerError !== undefined
                ? `provider error: ${providerError}`
                : redact(error instanceof Error ? error.message : String(error));
            records.push(
              toRecord({
                ...base,
                providerError,
                checks: [{ name: "runner", pass: false, reason }],
                text: "",
                toolCalls: [],
                usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                judge: undefined,
                botCostMicroUsd: 0,
                judgeCostMicroUsd: 0,
              }),
            );
          }
        }
      },
      RUN_TIMEOUT_MS * repeat,
    );
  }
});

afterAll(() => {
  if (calibration.length === 0 && records.length === 0) return;
  mkdirSync(RESULTS_DIR, { recursive: true });
  const file = `${RESULTS_DIR}/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const models = { bot: MODEL_ID, judge: JUDGE_MODEL_ID };

  // A calibration-only run, or one the calibration stopped, has no cases to report.
  if (records.length === 0) {
    writeFileSync(file, redact(JSON.stringify({ models, calibration }, null, 2)));
    process.stdout.write(`Results: ${file}\n`);
    return;
  }

  const summary = summarize(records, calibration);
  process.stdout.write(
    `\n${redact(formatReport(summary, records, `${MODEL_ID}, judged by ${JUDGE_MODEL_ID}`))}\n`,
  );
  const json = JSON.stringify({ models, repeat, calibration, summary, records }, null, 2);
  writeFileSync(file, redact(json));
  process.stdout.write(`Results: ${file}\n`);

  if (summary.verdict === "inconclusive") {
    throw new Error(`the eval run is inconclusive: ${summary.reasons.join("; ")}`);
  }
  if (summary.verdict === "fail") {
    throw new Error(`the eval run failed: ${summary.reasons.join("; ")}`);
  }
});
