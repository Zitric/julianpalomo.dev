/**
 * Limits the endpoint enforces and the chat UI shows, the price table that
 * turns token usage into spend, and the pure decision over both. Safe to
 * import in the browser: no server code, no D1 and no secrets here. Reading
 * and writing the counts lives in usage.ts, which only the server imports.
 */

/**
 * The most messages one request may carry. The endpoint rejects more, and the
 * chat UI sends only the latest this many, so a long conversation never hits
 * the cap.
 */
export const MAX_MESSAGES = 20;

/** The most text one visitor message may hold, summed over its text parts. */
export const MAX_VISITOR_TEXT = 1_000;

/** Questions one visitor may ask per UTC day. */
export const MAX_VISITOR_MESSAGES_PER_DAY = 30;

/** Estimated spend across all visitors per UTC day, in micro-dollars ($3.00). */
export const DAILY_BUDGET_MICRO_USD = 3_000_000;

/**
 * Micro-dollars per million tokens for Claude Sonnet 5.5: input $2, output
 * $10, cache writes (5 minutes) $2.50, cache reads $0.10 (0.05x the input
 * price on this model, not the usual 0.1x). These belong to the model: change
 * them whenever MODEL_ID in model.ts changes.
 */
const PRICE_MICRO_USD_PER_MILLION = {
  input: 2_000_000,
  output: 10_000_000,
  cacheWrite: 2_500_000,
  cacheRead: 100_000,
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
