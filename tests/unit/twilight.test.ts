import { describe, expect, it } from "vitest";
import { glasgow } from "../../src/lib/glasgow";
import { sunTimes } from "../../src/lib/sun";
import { nextTwilight } from "../../src/lib/twilight";

const MINUTE = 60_000;

/** A day's civil dawn and dusk, which these tests expect as the next twilight. */
function twilights(year: number, month: number, day: number) {
  const { civilDawn, civilDusk } = sunTimes({ year, month, day }, glasgow);
  if (civilDawn === null || civilDusk === null) throw new Error("No civil twilight in Glasgow");
  return { civilDawn, civilDusk };
}

describe("nextTwilight", () => {
  it("is the evening's civil dusk on a midsummer afternoon, about 23:09", () => {
    const { civilDusk } = twilights(2026, 6, 21);
    expect(nextTwilight(Date.parse("2026-06-21T14:00:00+01:00"))).toBe(civilDusk);
    // sun.test.ts holds the NOAA reference: 23:09:30.
    expect(Math.abs(civilDusk - Date.parse("2026-06-21T23:09:30+01:00"))).toBeLessThan(MINUTE);
  });

  it("is the next morning's civil dawn after a midsummer dusk, about 03:28", () => {
    const { civilDawn } = twilights(2026, 6, 22);
    expect(nextTwilight(Date.parse("2026-06-21T23:30:00+01:00"))).toBe(civilDawn);
    expect(Math.abs(civilDawn - Date.parse("2026-06-22T03:28:00+01:00"))).toBeLessThan(2 * MINUTE);
  });

  it("is the same evening's dusk on a midwinter morning, about 16:32", () => {
    const { civilDusk } = twilights(2026, 12, 21);
    expect(nextTwilight(Date.parse("2026-12-21T10:00:00Z"))).toBe(civilDusk);
  });

  it("is that day's dawn just after midnight", () => {
    const { civilDawn } = twilights(2026, 12, 21);
    expect(nextTwilight(Date.parse("2026-12-21T00:05:00Z"))).toBe(civilDawn);
  });

  it("is the coming one a minute before a twilight, and the following one a minute after", () => {
    const { civilDawn, civilDusk } = twilights(2026, 10, 28);
    expect(nextTwilight(civilDusk - MINUTE)).toBe(civilDusk);
    expect(nextTwilight(civilDusk + MINUTE)).toBe(twilights(2026, 10, 29).civilDawn);
    expect(nextTwilight(civilDawn - MINUTE)).toBe(civilDawn);
    expect(nextTwilight(civilDawn + MINUTE)).toBe(civilDusk);
  });

  it("is strictly after now, so a press at the very moment of a twilight waits for the next", () => {
    const { civilDawn, civilDusk } = twilights(2026, 10, 28);
    expect(nextTwilight(civilDawn)).toBe(civilDusk);
    expect(nextTwilight(civilDusk)).toBe(twilights(2026, 10, 29).civilDawn);
  });
});
