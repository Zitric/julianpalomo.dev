/**
 * The judge's calibration: fixed answers, each built on real claims, with the
 * verdict the judge must give. `pnpm eval` runs them before any case, and a
 * single wrong item stops the run: a judge that misses overclaims gives false
 * confidence. Never edit an item to make the judge pass; fix the judge's
 * prompt in judge-prompt.ts.
 */
import type { LanguageModel } from "ai";
import { confirmedClaims } from "../src/lib/claims";
import { type JudgeClaim, type JudgeOutcome, judgeAnswer, type Verdict } from "./judge";

export type CalibrationItem = {
  id: string;
  /** The claims the answer rests on, as if the bot's tools had returned them. */
  claimIds: string[];
  /** One sentence; it gets a citation marker for each claim, as a real answer would. */
  sentence: string;
  language: "en" | "es";
  expected: Verdict;
};

export const CALIBRATION_ITEMS: readonly CalibrationItem[] = [
  {
    id: "oms-lead-managed",
    claimIds: ["oms-lead"],
    sentence: "Julian managed a team of four developers at Orders Made Simple.",
    language: "en",
    expected: "overstated",
  },
  {
    id: "oms-lead-technical-lead",
    claimIds: ["oms-lead"],
    sentence: "At Orders Made Simple he was the technical lead for a team of four developers.",
    language: "en",
    expected: "supported",
  },
  {
    id: "onetrust-to-improve-cwv",
    claimIds: ["cazoo-onetrust"],
    sentence: "He lazy-loaded OneTrust to improve Core Web Vitals.",
    language: "en",
    expected: "overstated",
  },
  {
    id: "onetrust-part-of-cwv-work",
    claimIds: ["cazoo-onetrust"],
    sentence:
      "He lazy-loaded the OneTrust consent banner after page load, as part of the team's Core Web Vitals work.",
    language: "en",
    expected: "supported",
  },
  {
    id: "growthbook-introduced",
    claimIds: ["cazoo-growthbook"],
    sentence: "Julian introduced GrowthBook at Cazoo.",
    language: "en",
    expected: "overstated",
  },
  {
    id: "growthbook-connected",
    claimIds: ["cazoo-growthbook"],
    sentence: "He connected the Next.js app to GrowthBook feature flags.",
    language: "en",
    expected: "supported",
  },
  {
    id: "typescript-seven-years",
    claimIds: ["skills-core"],
    sentence: "He has seven years of TypeScript experience.",
    language: "en",
    expected: "overstated",
  },
  {
    id: "typescript-cinco-anos",
    claimIds: ["skills-core"],
    sentence: "Tiene 5 años de experiencia con TypeScript.",
    language: "es",
    expected: "supported",
  },
  {
    id: "oms-dirigio-departamento",
    claimIds: ["oms-lead"],
    sentence: "En Orders Made Simple dirigió el departamento de ingeniería.",
    language: "es",
    expected: "overstated",
  },
  {
    id: "zustand-backend-api",
    claimIds: ["cazoo-zustand"],
    sentence: "He also wrote the backend API for the shortlist feature.",
    language: "en",
    expected: "unsupported",
  },
  {
    id: "not-covered-linkedin",
    claimIds: [],
    sentence: "The claims don't cover that; you can ask Julian on LinkedIn.",
    language: "en",
    expected: "not_a_claim",
  },
];

const RUBRIC =
  "This is a calibration answer with no question of its own: judge its sentences, and treat the rubric as met.";

/** The claims of an item, with their full texts. Throws for an id that isn't a confirmed claim. */
export function calibrationClaims(item: CalibrationItem): JudgeClaim[] {
  const claims = confirmedClaims();
  return item.claimIds.map((id) => {
    const claim = claims.find((candidate) => candidate.id === id);
    if (claim === undefined)
      throw new Error(`calibration ${item.id}: ${id} is not a confirmed claim`);
    const { label, org, text } = claim;
    return org === undefined ? { id, label, text } : { id, label, org, text };
  });
}

export type CalibrationResult = {
  id: string;
  pass: boolean;
  expected: Verdict;
  /** The verdict of each sentence the judge returned, in order. */
  verdicts: Verdict[];
  /** Why it failed, in one line; empty when it passed. */
  reason: string;
  costMicroUsd: number;
};

/**
 * An item passes only when the judge returned at least one sentence and every
 * one has the expected verdict. No sentences at all is a failure, and so is
 * a judge error.
 */
export function calibrationResult(item: CalibrationItem, outcome: JudgeOutcome): CalibrationResult {
  const base = { id: item.id, expected: item.expected, costMicroUsd: outcome.costMicroUsd };
  if (outcome.status === "error") {
    return { ...base, pass: false, verdicts: [], reason: `judge-error: ${outcome.error}` };
  }
  const verdicts = outcome.verdict.sentences.map((sentence) => sentence.verdict);
  if (verdicts.length === 0) {
    return { ...base, pass: false, verdicts, reason: "the judge returned no sentences" };
  }
  const pass = verdicts.every((verdict) => verdict === item.expected);
  return {
    ...base,
    pass,
    verdicts,
    reason: pass ? "" : `expected ${item.expected}, got ${verdicts.join(", ")}`,
  };
}

/** Runs `run` over `items`, at most `limit` at a time, keeping their order. */
async function mapWithLimit<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item !== undefined) results[index] = await run(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Asks the judge about every calibration item, four at a time. */
export async function runCalibration(
  model: LanguageModel,
  judge: typeof judgeAnswer = judgeAnswer,
): Promise<CalibrationResult[]> {
  return mapWithLimit(CALIBRATION_ITEMS, 4, async (item) => {
    const marked =
      item.claimIds.length === 0
        ? item.sentence
        : `${item.sentence} ${item.claimIds.map((id) => `[[${id}]]`).join(" ")}`;
    const outcome = await judge(
      {
        earlierTurns: [],
        question: undefined,
        answer: marked,
        claims: calibrationClaims(item),
        language: item.language,
        rubric: RUBRIC,
      },
      model,
    );
    return calibrationResult(item, outcome);
  });
}
