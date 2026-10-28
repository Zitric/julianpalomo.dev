/**
 * The eval run: every case against the real model, then the report. Run it
 * with `pnpm eval`, or one case with `pnpm eval -t <case-id>`; it costs
 * money. The per-case tests never fail on their own: the run's verdict comes
 * from the thresholds in report.ts, and afterAll fails the command when they
 * aren't met.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { inspect } from "node:util";
import { afterAll, describe, test } from "vitest";
import { z } from "zod";
import { MODEL_ID } from "../src/lib/bot/model";
import { loadCases } from "./cases";
import { checkAnswer } from "./checks";
import {
  COST_CAP_MICRO_USD,
  formatReport,
  type RunRecord,
  skippedRecord,
  summarize,
  toRecord,
} from "./report";
import { runCase } from "./run-case";

const DEV_VARS = ".dev.vars";
const RESULTS_DIR = "evals/results";
/** The longest one run of one case may take, all its turns included. */
const RUN_TIMEOUT_MS = 120_000;

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
const records: RunRecord[] = [];
let spentMicroUsd = 0;

describe.concurrent("assistant", () => {
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
            records.push(
              toRecord({
                ...base,
                checks: checkAnswer(result, evalCase.expect),
                text: result.text,
                toolCalls: result.toolCalls,
                usage: result.usage,
                costMicroUsd: result.costMicroUsd,
              }),
            );
          } catch (error) {
            // A runner failure is a failed run with its reason, not a crash of the whole run.
            const reason = redact(error instanceof Error ? error.message : String(error));
            records.push(
              toRecord({
                ...base,
                checks: [{ name: "runner", pass: false, reason }],
                text: "",
                toolCalls: [],
                usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                costMicroUsd: 0,
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
  if (records.length === 0) return;
  const summary = summarize(records);
  process.stdout.write(`\n${redact(formatReport(summary, records, MODEL_ID))}\n`);

  mkdirSync(RESULTS_DIR, { recursive: true });
  const file = `${RESULTS_DIR}/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const json = JSON.stringify({ model: MODEL_ID, repeat, summary, records }, null, 2);
  writeFileSync(file, redact(json));
  process.stdout.write(`Results: ${file}\n`);

  if (!summary.pass) throw new Error(`the eval run failed: ${summary.reasons.join("; ")}`);
});
