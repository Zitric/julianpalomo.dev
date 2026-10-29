/**
 * The page's entrance (DESIGN.md section 11, "Entrance"): which one a visit
 * gets, and the beats of the full one. Pure and free of React so the cookie
 * and the schedule can be unit-tested. src/styles/entrance.css holds the same
 * times for everything CSS animates on its own; this module is for what only
 * JavaScript can do: the cow's flight, its states and the greeting typing
 * itself out.
 */
import { z } from "zod";
import type { CowState } from "./cow-state";

export type EntranceKind = "full" | "short";

/** Set on every visit, so the full entrance plays again only after a week away. */
export const ENTRANCE_COOKIE = "visited";
const ENTRANCE_MAX_AGE = 7 * 24 * 60 * 60;

const cookieSchema = z.literal("1");

/** A first visit, or the first in a week, gets the full entrance; any other the short one. */
export function entranceKind(cookie: unknown): EntranceKind {
  return cookieSchema.safeParse(cookie).success ? "short" : "full";
}

/** The cookie the server sets, or refreshes, on every visit. */
export function entranceCookie({ secure }: { secure: boolean }) {
  return {
    name: ENTRANCE_COOKIE,
    value: "1",
    options: {
      maxAge: ENTRANCE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure,
    },
  } as const;
}

/**
 * The full entrance's beats, in ms from the page's first paint. Keep in step
 * with src/styles/entrance.css, which times the chat's appearance (LANDING)
 * and everything before it.
 */
export const BEATS = {
  /** The cow pops up, big, in the middle of the hero, and talks. */
  heroCow: 2500,
  /** "Hi! I'm the Highland cow" appears beside or above it… */
  bubble: 3150,
  /** …it stops talking and licks once… */
  heroLick: 4250,
  /** …it flies to the chat's edge… */
  flight: 4600,
  /** …the bubble goes, 1.7s after it came… */
  bubbleGone: 4850,
  /** …it lands, and the chat appears… */
  landing: 5150,
  /** …and the greeting starts typing itself out. */
  greeting: 5550,
} as const;

/** How long the flight from the hero to the edge takes: BEATS.landing − BEATS.flight. */
export const FLIGHT_MS = BEATS.landing - BEATS.flight;

/** When the short entrance is over. */
export const SHORT_MS = 2000;

/** How long after the greeting has typed itself out the full entrance is over. */
export const AFTER_GREETING_MS = 1200;

/** Where the full entrance is, from the first paint until the greeting starts. */
export type Beat = "glen" | "heroCow" | "heroLick" | "flight" | "landed" | "greeting";

/** The beat at `elapsed` ms from the first paint. */
export function beatAt(elapsed: number): Beat {
  if (elapsed < BEATS.heroCow) return "glen";
  if (elapsed < BEATS.heroLick) return "heroCow";
  if (elapsed < BEATS.flight) return "heroLick";
  if (elapsed < BEATS.landing) return "flight";
  if (elapsed < BEATS.greeting) return "landed";
  return "greeting";
}

/** Whether the hero's bubble is up at `elapsed`. */
export function bubbleAt(elapsed: number): boolean {
  return elapsed >= BEATS.bubble && elapsed < BEATS.bubbleGone;
}

/** How long until something changes after `elapsed`, or null once every beat has passed. */
export function nextBeatIn(elapsed: number): number | null {
  const next = Object.values(BEATS)
    .filter((time) => time > elapsed)
    .sort((a, b) => a - b)[0];
  return next === undefined ? null : next - elapsed;
}

/** The cow's state at a beat; while the greeting types itself out, it talks. */
export function entranceCowState(beat: Beat): CowState {
  switch (beat) {
    case "glen":
      return "idle";
    case "heroCow":
      return "talking";
    case "heroLick":
    case "flight":
    case "landed":
      return "satisfied";
    case "greeting":
      return "talking";
    default: {
      const unhandled: never = beat;
      throw new Error(String(unhandled));
    }
  }
}

/**
 * How the page joins the full entrance when its JavaScript starts at
 * `elapsed`, which on a slow phone can be late: it never replays a beat that
 * has passed.
 *
 * - `cow`: "pop" while the cow's entrance is still ahead, "hero" when it should
 *   already be in the hero (it appears there at once, then flies), "edge" once
 *   the flight has begun (it skips the flight and waits on the edge, where the
 *   CSS shows it at the landing).
 * - `greeting`: "type" while the chat is still hidden, "whole" once it's on
 *   screen, so text already shown is never taken away and typed again.
 */
export type Join = { cow: "pop" | "hero" | "edge"; greeting: "type" | "whole" };

export function joinAt(elapsed: number): Join {
  const greeting = elapsed < BEATS.landing ? "type" : "whole";
  if (elapsed < BEATS.heroCow) return { cow: "pop", greeting };
  if (elapsed < BEATS.flight) return { cow: "hero", greeting };
  return { cow: "edge", greeting };
}

/** The hero cow's width, in px: about 200, and at most 62% of the hero's height. */
export function heroCowWidth(heroHeight: number): number {
  // The drawing is 190 × 150.
  return Math.min(200, (heroHeight * 0.62 * 190) / 150);
}
