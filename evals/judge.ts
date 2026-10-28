/**
 * The judge: a second, stronger model that reads one answer against the
 * claims the bot's tools returned, sentence by sentence, and says whether the
 * answer is in the case's language and meets its rubric. Code can check
 * citations and links; only the judge can tell that "managed a team of four"
 * says more than "technical lead in a team of 4 developers".
 */
import type { AnthropicLanguageModelOptions } from "@ai-sdk/anthropic";
import {
  generateText,
  type LanguageModel,
  type LanguageModelUsage,
  NoObjectGeneratedError,
  Output,
} from "ai";
import { z } from "zod";
import type { TokenUsage } from "../src/lib/bot/limits";
import type { CheckResult } from "./checks";
import { JUDGE_PROMPT } from "./judge-prompt";
import type { ToolCall } from "./run-case";

/** Julian's choice of judge: stronger than the bot's model, so subtle overclaims don't slip past. */
export const JUDGE_MODEL_ID = "claude-sonnet-5-5";

// Set explicitly: this model's API default is `high`. Its thinking is always
// adaptive and `effort` is the only control; never add temperature, topP or topK.
const JUDGE_OPTIONS = { effort: "medium" } as const satisfies AnthropicLanguageModelOptions;

// Thinking counts toward this cap, so it leaves room beyond the verdict itself.
const JUDGE_MAX_OUTPUT_TOKENS = 8_000;

/**
 * Micro-dollars per million tokens for Claude Sonnet 5.5. Input $2 and output
 * $10 are the prices in docs/adr/2026-10-27-claude-model-and-ai-sdk-7.md.
 * Nothing here turns prompt caching on, but if the API reports cache tokens
 * anyway: writes are charged at 1.25× the input price, the 5-minute write
 * multiplier limits.ts uses for Haiku (not checked for Sonnet), and reads at
 * the full input price, which overestimates them.
 */
const JUDGE_PRICE_MICRO_USD_PER_MILLION = {
  input: 2_000_000,
  output: 10_000_000,
  cacheWrite: 2_500_000,
  cacheRead: 2_000_000,
} as const;

const VERDICTS = ["supported", "overstated", "unsupported", "not_a_claim"] as const;
export type Verdict = (typeof VERDICTS)[number];

const verdictSchema = z.object({
  sentences: z.array(
    z.object({
      sentence: z.string(),
      verdict: z.enum(VERDICTS),
      claimIds: z.array(z.string()),
      reason: z.string(),
    }),
  ),
  language: z.object({ matches: z.boolean(), reason: z.string() }),
  rubric: z.object({ met: z.boolean(), reason: z.string() }),
});

export type JudgeVerdict = z.infer<typeof verdictSchema>;

/** Validates the judge's output; throws with Zod's message when it's malformed. */
export function parseJudgeVerdict(input: unknown): JudgeVerdict {
  return verdictSchema.parse(input);
}

/** A claim as the judge sees it: the full text, which the tools returned. */
export type JudgeClaim = { id: string; label: string; org?: string; text: string };

export type JudgeInput = {
  /** The conversation before the question, oldest first. */
  earlierTurns: { role: "visitor" | "assistant"; text: string }[];
  /** Absent for a calibration item, which has an answer but no question. */
  question: string | undefined;
  answer: string;
  claims: JudgeClaim[];
  language: "en" | "es";
  rubric: string;
};

/** What one judge call gave: a verdict, or why there isn't one. Either way it cost something. */
export type JudgeOutcome =
  | { status: "judged"; verdict: JudgeVerdict; usage: TokenUsage; costMicroUsd: number }
  | { status: "error"; error: string; usage: TokenUsage; costMicroUsd: number };

const toolClaimsSchema = z.object({
  claims: z.array(
    z.object({ id: z.string(), label: z.string(), org: z.string().optional(), text: z.string() }),
  ),
});

/** The full claims that `get_claims` and `search_claims` returned in an answer, each once. */
export function claimsFromToolCalls(toolCalls: readonly ToolCall[]): JudgeClaim[] {
  const claims = new Map<string, JudgeClaim>();
  for (const call of toolCalls) {
    const parsed = toolClaimsSchema.safeParse(call.output);
    if (!parsed.success) continue;
    for (const { id, label, org, text } of parsed.data.claims) {
      if (!claims.has(id))
        claims.set(id, org === undefined ? { id, label, text } : { id, label, org, text });
    }
  }
  return [...claims.values()];
}

/** The user message: every piece the judge needs, each in its own tag. */
function judgePrompt(input: JudgeInput): string {
  const turns =
    input.earlierTurns.length === 0
      ? "None."
      : input.earlierTurns.map(({ role, text }) => `${role}: ${text}`).join("\n\n");
  const claims =
    input.claims.length === 0
      ? "None: the assistant looked up no claims."
      : input.claims
          .map(
            ({ id, label, org, text }) =>
              `[${id}] ${org === undefined ? "" : `${org} · `}${label}: ${text}`,
          )
          .join("\n");
  return [
    `<earlier_turns>\n${turns}\n</earlier_turns>`,
    `<question>\n${input.question ?? "Not given."}\n</question>`,
    `<answer>\n${input.answer}\n</answer>`,
    `<claims>\n${claims}\n</claims>`,
    `<language>${input.language}</language>`,
    `<rubric>\n${input.rubric}\n</rubric>`,
  ].join("\n\n");
}

function tokenUsage(usage: LanguageModelUsage | undefined): TokenUsage {
  return {
    input: usage?.inputTokenDetails.noCacheTokens ?? usage?.inputTokens ?? 0,
    output: usage?.outputTokens ?? 0,
    cacheRead: usage?.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWrite: usage?.inputTokenDetails.cacheWriteTokens ?? 0,
  };
}

/** What a judge call cost, in whole micro-dollars, rounded up. */
export function judgeCostMicroUsd(usage: TokenUsage): number {
  const price = JUDGE_PRICE_MICRO_USD_PER_MILLION;
  const total =
    usage.input * price.input +
    usage.output * price.output +
    usage.cacheWrite * price.cacheWrite +
    usage.cacheRead * price.cacheRead;
  return Math.ceil(total / 1_000_000);
}

function outcomeError(error: string, usage: TokenUsage): JudgeOutcome {
  return { status: "error", error, usage, costMicroUsd: judgeCostMicroUsd(usage) };
}

/**
 * Asks the judge about one answer. A failure of the judge itself, such as
 * output that doesn't fit the schema or a safety block, comes back as an
 * error outcome, never as a thrown error and never as a verdict on the bot.
 */
export async function judgeAnswer(input: JudgeInput, model: LanguageModel): Promise<JudgeOutcome> {
  try {
    const result = await generateText({
      model,
      instructions: JUDGE_PROMPT,
      prompt: judgePrompt(input),
      output: Output.object({ schema: verdictSchema }),
      maxOutputTokens: JUDGE_MAX_OUTPUT_TOKENS,
      providerOptions: { anthropic: JUDGE_OPTIONS },
    });
    const usage = tokenUsage(result.totalUsage);
    if (result.finishReason === "content-filter") {
      return outcomeError("the judge's request was blocked by a safety classifier", usage);
    }
    return {
      status: "judged",
      verdict: result.output,
      usage,
      costMicroUsd: judgeCostMicroUsd(usage),
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return outcomeError(
        `the judge's output didn't fit the schema (finish: ${error.finishReason ?? "unknown"})`,
        tokenUsage(error.usage),
      );
    }
    return outcomeError(
      `the judge call failed: ${error instanceof Error ? error.message : String(error)}`,
      tokenUsage(undefined),
    );
  }
}

/** One line, however the judge wrote it, so the report stays one line per reason. */
function oneLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The judge's pass/fail rule as checks: any `overstated` or `unsupported`
 * sentence fails, and so does the wrong language or an unmet rubric. A judge
 * failure is one `judge-error` check, kept apart from the bot's failures.
 */
export function judgeChecks(outcome: JudgeOutcome): CheckResult[] {
  if (outcome.status === "error") {
    return [{ name: "judge-error", pass: false, reason: oneLine(outcome.error) }];
  }
  const { sentences, language, rubric } = outcome.verdict;
  if (sentences.length === 0) {
    return [{ name: "judge-error", pass: false, reason: "the judge returned no sentences" }];
  }
  const failing = sentences.filter(
    (sentence) => sentence.verdict === "overstated" || sentence.verdict === "unsupported",
  );
  return [
    {
      name: "judge-sentences",
      pass: failing.length === 0,
      reason:
        failing.length === 0
          ? "ok"
          : failing
              .map(
                (sentence) =>
                  `${sentence.verdict}: "${oneLine(sentence.sentence)}" (${oneLine(sentence.reason)})`,
              )
              .join("; "),
    },
    {
      name: "judge-language",
      pass: language.matches,
      reason: language.matches ? "ok" : oneLine(language.reason),
    },
    { name: "judge-rubric", pass: rubric.met, reason: rubric.met ? "ok" : oneLine(rubric.reason) },
  ];
}
