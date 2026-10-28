import { describe, expect, it } from "vitest";
import {
  checkLimits,
  DAILY_BUDGET_MICRO_USD,
  estimateCostMicroUsd,
  MAX_VISITOR_MESSAGES_PER_DAY,
} from "../../src/lib/bot/limits";

describe("checkLimits", () => {
  it("lets a question through under both limits", () => {
    expect(checkLimits({ visitorMessages: 0, spentMicroUsd: 0 })).toEqual({ ok: true });
    expect(
      checkLimits({
        visitorMessages: MAX_VISITOR_MESSAGES_PER_DAY - 1,
        spentMicroUsd: DAILY_BUDGET_MICRO_USD - 1,
      }),
    ).toEqual({ ok: true });
  });

  it.each([MAX_VISITOR_MESSAGES_PER_DAY, MAX_VISITOR_MESSAGES_PER_DAY + 5])(
    "stops a visitor who already asked %i questions today",
    (visitorMessages) => {
      expect(checkLimits({ visitorMessages, spentMicroUsd: 0 })).toEqual({
        ok: false,
        limit: "visitor_limit",
      });
    },
  );

  it.each([DAILY_BUDGET_MICRO_USD, DAILY_BUDGET_MICRO_USD + 1])(
    "stops everyone once %i micro-dollars are spent",
    (spentMicroUsd) => {
      expect(checkLimits({ visitorMessages: 0, spentMicroUsd })).toEqual({
        ok: false,
        limit: "daily_budget",
      });
    },
  );

  it("reports the budget when both limits are hit", () => {
    expect(
      checkLimits({
        visitorMessages: MAX_VISITOR_MESSAGES_PER_DAY,
        spentMicroUsd: DAILY_BUDGET_MICRO_USD,
      }),
    ).toEqual({ ok: false, limit: "daily_budget" });
  });
});

describe("estimateCostMicroUsd", () => {
  it("prices each kind of token at Sonnet 5.5's rate", () => {
    // A million of each: $2 + $10 + $2.50 + $0.10.
    expect(
      estimateCostMicroUsd({
        input: 1_000_000,
        output: 1_000_000,
        cacheWrite: 1_000_000,
        cacheRead: 1_000_000,
      }),
    ).toBe(14_600_000);
  });

  it("prices a typical answer with a cache read", () => {
    // 200 input, 300 output and 1,500 cached tokens:
    // (200 × 2,000,000 + 300 × 10,000,000 + 1,500 × 100,000) / 1,000,000 = 3,550.
    expect(estimateCostMicroUsd({ input: 200, output: 300, cacheWrite: 0, cacheRead: 1_500 })).toBe(
      3_550,
    );
  });

  it("rounds a fraction of a micro-dollar up, never down", () => {
    // One cache read is 0.1 micro-dollars.
    expect(estimateCostMicroUsd({ input: 0, output: 0, cacheWrite: 0, cacheRead: 1 })).toBe(1);
    expect(estimateCostMicroUsd({ input: 0, output: 0, cacheWrite: 0, cacheRead: 0 })).toBe(0);
  });
});
