import { describe, expect, it } from "vitest";
import {
  advanceReveal,
  MAX_LAG_S,
  onScreen,
  REVEAL_CPS,
  type Reveal,
  revealStops,
} from "../../src/components/chat/reveal";

const TICK_MS = 50;

/** Runs the reveal for `ms` in ticks, as the chat's timer would, and returns each length shown. */
function run(
  from: Reveal,
  stops: readonly number[],
  ms: number,
): { reveal: Reveal; shown: number[] } {
  let reveal = from;
  const shown: number[] = [];
  for (let elapsed = 0; elapsed < ms; elapsed += TICK_MS) {
    reveal = advanceReveal(reveal, stops, TICK_MS);
    shown.push(reveal.shown);
  }
  return { reveal, shown };
}

const start: Reveal = { shown: 0, carry: 0 };

describe("revealStops", () => {
  it("stops at the end of each word of a finished answer", () => {
    expect(revealStops("Based in Glasgow.", false)).toEqual([5, 8, 17]);
  });

  it("holds back the last word while the answer streams", () => {
    expect(revealStops("Based in Glasg", true)).toEqual([5, 8]);
  });

  it("keeps a citation with the word before it, spaced or not", () => {
    const text = "Based in Glasgow. [[location]] Then UK.[[uk]]";
    expect(revealStops(text, false)).toEqual([5, 8, 30, 35, 45]);
  });

  it("ignores a marker still arriving, so the word before it waits for it", () => {
    expect(revealStops("Based in Glasgow. [[loca", true)).toEqual([5, 8]);
    expect(revealStops("Based in Glasgow. [[location]] Then", true)).toEqual([5, 8, 30]);
  });
});

describe("advanceReveal", () => {
  const words = "word ".repeat(200).trimEnd();
  const stops = revealStops(words, false);

  it("types at a steady pace", () => {
    // 90 characters arrived: within MAX_LAG_S of typing, so no catching up.
    const near = stops.filter((stop) => stop <= 90);
    const { reveal } = run(start, near, 1000);
    expect(reveal.shown).toBeGreaterThanOrEqual(REVEAL_CPS - 5);
    expect(reveal.shown).toBeLessThanOrEqual(REVEAL_CPS);
  });

  it("reveals whole words only, one tick at a time", () => {
    const { shown } = run(start, stops, 500);
    for (const length of shown) expect(length === 0 || stops.includes(length)).toBe(true);
    expect(new Set(shown).size).toBeGreaterThan(5);
  });

  it("catches up when far behind what has arrived", () => {
    const { reveal } = run(start, stops, 1000);
    expect(reveal.shown).toBeGreaterThan(REVEAL_CPS * 3);
    // The lag shrinks with a MAX_LAG_S time constant: from about 1,000
    // characters behind, it's within MAX_LAG_S of typing after about 3.6s.
    const after = run(start, stops, 4000).reveal;
    expect((stops.at(-1) ?? 0) - after.shown).toBeLessThanOrEqual(REVEAL_CPS * MAX_LAG_S);
  });

  it("reveals a citation whole, never part of its marker", () => {
    const text =
      "It was a role at Cazoo. [[cazoo-role]] He led the upgrade.[[cazoo-react-19]] Done.";
    const answerStops = revealStops(text, false);
    const { shown } = run(start, answerStops, 3000);
    expect(shown.at(-1)).toBe(text.length);
    for (const length of shown) {
      const typed = text.slice(0, length);
      expect(typed.split("[[").length).toBe(typed.split("]]").length);
    }
  });

  it("carries time over to a long word, and banks none once caught up", () => {
    const long = revealStops("a supercalifragilisticexpialidocious b", false);
    // At 60 characters a second the 35-character word takes about 0.6s.
    expect(run(start, long, 400).reveal.shown).toBe(long[0]);
    expect(run(start, long, 750).reveal.shown).toBeGreaterThanOrEqual(long[1] ?? 0);
    expect(advanceReveal({ shown: 38, carry: 5 }, long, TICK_MS)).toEqual({ shown: 38, carry: 0 });
  });
});

describe("onScreen", () => {
  const text = "Based in Glasgow. [[loca";
  const stops = revealStops(text, true);

  it("shows what has been typed, never past the last stop", () => {
    expect(onScreen(5, text, stops, false)).toBe(5);
    expect(onScreen(40, text, stops, false)).toBe(8);
  });

  it("shows everything that has arrived at once when instant, as after Stop", () => {
    expect(onScreen(5, text, stops, true)).toBe(text.length);
  });
});
