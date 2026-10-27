/**
 * Today's counts behind the chat's limits, kept in D1 so they survive Worker
 * restarts. Server only: chat.ts is the one importer. The limits themselves
 * and the cost of tokens live in limits.ts, which the browser can import.
 *
 * Two requests can read the same count and both pass, so a visitor or the
 * budget can go over by one answer. That is accepted rather than locked.
 */
import type { TokenUsage } from "./limits";

/**
 * The part of D1's binding this module uses (prepare, bind, first, run, from
 * Cloudflare's D1 Worker API docs). Written by hand: docs/tech-debt.md.
 */
export type D1Like = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      run(): Promise<unknown>;
    };
  };
};

/** True when a binding looks like D1, so a missing or wrong binding fails closed. */
export function isD1(value: unknown): value is D1Like {
  return (
    typeof value === "object" &&
    value !== null &&
    "prepare" in value &&
    typeof value.prepare === "function"
  );
}

/** Today's date in UTC as YYYY-MM-DD. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * An anonymous id for one visitor on one day: a SHA-256 of the salt, the day
 * and the IP. The IP is never stored, and with the day in the hash the same
 * person gets a different id tomorrow.
 */
export async function visitorHash(ip: string, day: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}\n${day}\n${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type UsageStore = {
  readToday(
    day: string,
    visitor: string,
  ): Promise<{ visitorMessages: number; spentMicroUsd: number }>;
  countMessage(day: string, visitor: string): Promise<void>;
  addUsage(day: string, usage: TokenUsage, costMicroUsd: number): Promise<void>;
};

export function d1UsageStore(db: D1Like): UsageStore {
  return {
    async readToday(day, visitor) {
      const [messages, usage] = await Promise.all([
        db
          .prepare("SELECT messages FROM visitor_messages WHERE visitor_hash = ? AND day = ?")
          .bind(visitor, day)
          .first<{ messages: number }>(),
        db
          .prepare("SELECT cost_micro_usd FROM daily_usage WHERE day = ?")
          .bind(day)
          .first<{ cost_micro_usd: number }>(),
      ]);
      return {
        visitorMessages: messages?.messages ?? 0,
        spentMicroUsd: usage?.cost_micro_usd ?? 0,
      };
    },

    async countMessage(day, visitor) {
      await db
        .prepare(
          `INSERT INTO visitor_messages (visitor_hash, day, messages) VALUES (?, ?, 1)
           ON CONFLICT (visitor_hash, day) DO UPDATE SET messages = messages + 1`,
        )
        .bind(visitor, day)
        .run();
    },

    async addUsage(day, usage, costMicroUsd) {
      await db
        .prepare(
          `INSERT INTO daily_usage
             (day, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, cost_micro_usd)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (day) DO UPDATE SET
             input_tokens = input_tokens + excluded.input_tokens,
             output_tokens = output_tokens + excluded.output_tokens,
             cache_read_tokens = cache_read_tokens + excluded.cache_read_tokens,
             cache_write_tokens = cache_write_tokens + excluded.cache_write_tokens,
             cost_micro_usd = cost_micro_usd + excluded.cost_micro_usd`,
        )
        .bind(day, usage.input, usage.output, usage.cacheRead, usage.cacheWrite, costMicroUsd)
        .run();
    },
  };
}
