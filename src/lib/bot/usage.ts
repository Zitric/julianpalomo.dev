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
 * What a visitor is counted by: an IPv4 address as it is, or the /64 an IPv6
 * address belongs to, because one IPv6 user can rotate through every address
 * of their /64 and would otherwise get a fresh limit with each. An
 * IPv4-mapped address (::ffff:203.0.113.7) counts as its IPv4. Anything that
 * isn't an IPv6 address, such as the local id, passes through unchanged.
 */
export function visitorKey(ip: string): string {
  if (!ip.includes(":")) return ip;
  const groups = ipv6Groups(ip);
  if (groups === undefined) return ip;
  const [hi = 0, lo = 0] = groups.slice(6);
  if (groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff) {
    return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff].join(".");
  }
  return `${groups
    .slice(0, 4)
    .map((group) => group.toString(16))
    .join(":")}::/64`;
}

/** The eight 16-bit groups of an IPv6 address, or undefined if it isn't one. */
function ipv6Groups(ip: string): number[] | undefined {
  let text = ip.toLowerCase();
  // A dotted IPv4 tail (::ffff:203.0.113.7) stands for the last two groups.
  const tailGroups: number[] = [];
  const tail = /^(.*:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(text);
  if (tail !== null) {
    const bytes = tail.slice(2).map(Number);
    if (bytes.some((byte) => byte > 255)) return undefined;
    const [b0 = 0, b1 = 0, b2 = 0, b3 = 0] = bytes;
    tailGroups.push((b0 << 8) | b1, (b2 << 8) | b3);
    const head = tail[1] ?? "";
    text = head.endsWith("::") ? head : head.slice(0, -1);
  }

  const halves = text.split("::");
  if (halves.length > 2) return undefined;
  const split = (part: string | undefined) => (part ? part.split(":") : []);
  const head = split(halves[0]);
  const wanted = 8 - tailGroups.length;
  let groups = head;
  if (halves.length === 2) {
    const rest = split(halves[1]);
    // "::" stands for one or more zero groups.
    const missing = wanted - head.length - rest.length;
    if (missing < 1) return undefined;
    groups = [...head, ...Array.from({ length: missing }, () => "0"), ...rest];
  }
  if (groups.length !== wanted) return undefined;
  if (!groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return undefined;
  return [...groups.map((group) => Number.parseInt(group, 16)), ...tailGroups];
}

/**
 * An anonymous id for one visitor on one day: a SHA-256 of the salt, the day
 * and the visitor's key (visitorKey). Neither the IP nor its /64 is ever
 * stored, and with the day in the hash the same person gets a different id
 * tomorrow.
 */
export async function visitorHash(ip: string, day: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}\n${day}\n${visitorKey(ip)}`);
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
