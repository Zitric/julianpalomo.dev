/**
 * The answer typing itself out (DESIGN.md section 10): what has arrived waits
 * in a buffer and is revealed word by word at a steady pace, whatever pace the
 * stream has. Pure and free of React so the pacing can be unit-tested.
 */
import { hideTrailingPartialMarker } from "./chat-view";

/** Characters a second the answer types itself out at. */
export const REVEAL_CPS = 60;

/** How far behind what has arrived, in seconds of typing, the reveal may fall before it speeds up. */
export const MAX_LAG_S = 1.5;

/**
 * Where the reveal may stop in the answer's text: the end of each word. A
 * citation marker after a word belongs to that word, so it's revealed whole,
 * with it. While the answer streams, the last word isn't a stop yet: it may
 * be cut short, or a marker may still follow it.
 */
export function revealStops(text: string, streaming: boolean): number[] {
  const visible = streaming ? hideTrailingPartialMarker(text) : text;
  const stops: number[] = [];
  for (const word of visible.matchAll(/\s*\S+/g)) {
    const end = word.index + word[0].length;
    if (word[0].trimStart().startsWith("[[") && stops.length > 0) stops[stops.length - 1] = end;
    else stops.push(end);
  }
  if (streaming) stops.pop();
  return stops;
}

/** How much of the text is on screen, and the typing time not spent yet. */
export type Reveal = { shown: number; carry: number };

/**
 * Moves the reveal on by `elapsedMs`, stopping only at `stops`. It types
 * REVEAL_CPS characters a second, or faster when more than MAX_LAG_S of
 * typing is waiting, so a long answer never lags far behind. Characters it
 * can't spend yet, because the next word is longer, carry over to the next
 * call; once it has caught up, nothing carries over.
 */
export function advanceReveal(reveal: Reveal, stops: readonly number[], elapsedMs: number): Reveal {
  const waiting = (stops.at(-1) ?? 0) - reveal.shown;
  if (waiting <= 0) return { shown: reveal.shown, carry: 0 };
  const perSecond = Math.max(REVEAL_CPS, waiting / MAX_LAG_S);
  const budget = reveal.carry + (perSecond * elapsedMs) / 1000;
  let shown = reveal.shown;
  for (const stop of stops) {
    if (stop <= reveal.shown) continue;
    if (stop - reveal.shown > budget) break;
    shown = stop;
  }
  return { shown, carry: budget - (shown - reveal.shown) };
}

/**
 * How much of the text is on screen. An instant reveal (reduced motion, Stop,
 * an error) shows everything that has arrived, the last word included;
 * otherwise it's what the reveal has typed, never past the last stop.
 */
export function onScreen(
  typed: number,
  text: string,
  stops: readonly number[],
  instant: boolean,
): number {
  return instant ? text.length : Math.min(typed, stops.at(-1) ?? 0);
}
