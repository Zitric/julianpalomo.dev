/**
 * Limits the endpoint enforces and the chat UI shows, the price table that
 * turns token usage into spend, and the pure decision over both. Safe to
 * import in the browser: no server code, no D1 and no secrets here. Reading
 * and writing the counts lives in usage.ts, which only the server imports.
 */

/** The most text one visitor message may hold, summed over its text parts. */
export const MAX_VISITOR_TEXT = 1_000;

/** Questions one visitor may ask per UTC day. */
export const MAX_VISITOR_MESSAGES_PER_DAY = 30;

/** Estimated spend across all visitors per UTC day, in micro-dollars ($1.00). */
export const DAILY_BUDGET_MICRO_USD = 1_000_000;

/**
 * Micro-dollars per million tokens for Claude Haiku 5.5: input $0.10, output
 * $0.50, cache writes (5 minutes) $0.125, cache reads $0.01. These belong to
 * the model: change them whenever MODEL_ID in model.ts changes. The input and
 * output prices are the ones recorded in
 * docs/adr/2026-10-27-claude-model-and-ai-sdk-7.md.
 */
const PRICE_MICRO_USD_PER_MILLION = {
  input: 100_000,
  output: 500_000,
  cacheWrite: 125_000,
  cacheRead: 10_000,
} as const;

/** Tokens one answer used, split the way the price table charges them. */
export type TokenUsage = {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
};

/**
 * What an answer cost, in whole micro-dollars, rounded up so many small
 * answers can't add up to more than the estimate says. Integers, never
 * floats, so totals stored in D1 don't drift.
 */
export function estimateCostMicroUsd(usage: TokenUsage): number {
  const total =
    usage.input * PRICE_MICRO_USD_PER_MILLION.input +
    usage.output * PRICE_MICRO_USD_PER_MILLION.output +
    usage.cacheWrite * PRICE_MICRO_USD_PER_MILLION.cacheWrite +
    usage.cacheRead * PRICE_MICRO_USD_PER_MILLION.cacheRead;
  return Math.ceil(total / 1_000_000);
}

export type LimitCode = "daily_budget" | "visitor_limit";

/**
 * Whether one more question may reach the model today. The budget is checked
 * first: when it's spent, nobody gets through, whatever their own count.
 */
export function checkLimits(today: {
  visitorMessages: number;
  spentMicroUsd: number;
}): { ok: true } | { ok: false; limit: LimitCode } {
  if (today.spentMicroUsd >= DAILY_BUDGET_MICRO_USD) return { ok: false, limit: "daily_budget" };
  if (today.visitorMessages >= MAX_VISITOR_MESSAGES_PER_DAY) {
    return { ok: false, limit: "visitor_limit" };
  }
  return { ok: true };
}
