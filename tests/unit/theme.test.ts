import { describe, expect, it } from "vitest";
import { glasgow } from "../../src/lib/glasgow";
import { sunTimes } from "../../src/lib/sun";
import {
  isGlasgowNight,
  parseThemeCookie,
  resolveTheme,
  TWILIGHT_MARGIN_MS,
  themeChoiceCookie,
} from "../../src/lib/theme";

const MINUTE = 60_000;

const { civilDawn, civilDusk, solarNoon } = sunTimes({ year: 2026, month: 10, day: 28 }, glasgow);
if (civilDawn === null || civilDusk === null) throw new Error("No civil twilight in Glasgow");

describe("isGlasgowNight", () => {
  it("is day at solar noon", () => {
    expect(isGlasgowNight(solarNoon)).toBe(false);
  });

  it("starts at civil dusk", () => {
    expect(isGlasgowNight(civilDusk - MINUTE)).toBe(false);
    expect(isGlasgowNight(civilDusk + MINUTE)).toBe(true);
  });

  it("ends at civil dawn", () => {
    expect(isGlasgowNight(civilDawn - MINUTE)).toBe(true);
    expect(isGlasgowNight(civilDawn + MINUTE)).toBe(false);
  });

  // NOAA's apparent elevations, from the reference values in sun.test.ts.
  it("is still day at -5.75° (21 December, 16:30 GMT)", () => {
    expect(isGlasgowNight(Date.parse("2026-12-21T16:30:00Z"))).toBe(false);
  });

  it("is night at -6.10° (26 October, 17:30 GMT)", () => {
    expect(isGlasgowNight(Date.parse("2026-10-26T17:30:00Z"))).toBe(true);
  });
});

describe("resolveTheme", () => {
  it("keeps the visitor's choice whatever Glasgow's sun says", () => {
    expect(resolveTheme({ choice: "dark", now: solarNoon })).toBe("dark");
    expect(resolveTheme({ choice: "light", now: civilDusk + MINUTE })).toBe("light");
  });

  it("follows Glasgow's day and night without a choice", () => {
    expect(resolveTheme({ choice: null, now: solarNoon })).toBe("light");
    expect(resolveTheme({ choice: null, now: civilDusk + MINUTE })).toBe("dark");
    expect(resolveTheme({ choice: null, now: civilDawn + MINUTE })).toBe("light");
  });
});

describe("parseThemeCookie", () => {
  it("reads a theme and when it ends", () => {
    expect(parseThemeCookie(`dark.${civilDusk}`, solarNoon)).toEqual({
      theme: "dark",
      until: civilDusk,
    });
    expect(parseThemeCookie(`light.${civilDusk}`, solarNoon)).toEqual({
      theme: "light",
      until: civilDusk,
    });
  });

  it("treats a choice that has ended as no choice", () => {
    expect(parseThemeCookie(`dark.${civilDusk}`, civilDusk)).toBeNull();
    expect(parseThemeCookie(`dark.${civilDusk}`, civilDusk + MINUTE)).toBeNull();
  });

  it("treats the old one-year format, without an end, as no choice", () => {
    expect(parseThemeCookie("light", solarNoon)).toBeNull();
    expect(parseThemeCookie("dark", solarNoon)).toBeNull();
  });

  it("treats a missing or malformed value as no choice", () => {
    expect(parseThemeCookie(undefined, solarNoon)).toBeNull();
    expect(parseThemeCookie("", solarNoon)).toBeNull();
    expect(parseThemeCookie(`Dark.${civilDusk}`, solarNoon)).toBeNull();
    expect(parseThemeCookie(`system.${civilDusk}`, solarNoon)).toBeNull();
    expect(parseThemeCookie("dark.soon", solarNoon)).toBeNull();
    expect(parseThemeCookie(`dark.${civilDusk}.1`, solarNoon)).toBeNull();
  });
});

/**
 * Glasgow keeps the other theme from `now` until just before `until`'s
 * twilight: the choice ends at the first one that turns it, not a later one.
 */
function expectNoEarlierTurn(theme: "light" | "dark", now: number, until: number) {
  const lastBefore = until - TWILIGHT_MARGIN_MS - 2000;
  for (let at = now + 2000; at < lastBefore; at += 30 * MINUTE) {
    expect(resolveTheme({ choice: null, now: at })).not.toBe(theme);
  }
  if (lastBefore > now) expect(resolveTheme({ choice: null, now: lastBefore })).not.toBe(theme);
}

describe("themeChoiceCookie", () => {
  it("stores the other theme until just after Glasgow's next dusk or dawn", () => {
    const until = civilDusk + TWILIGHT_MARGIN_MS;
    expect(themeChoiceCookie("dark", solarNoon)).toEqual({
      action: "set",
      value: `dark.${until}`,
      maxAge: Math.ceil((until - solarNoon) / 1000),
      choice: { theme: "dark", until },
    });
  });

  it("ends only once Glasgow has turned to the chosen theme, all year round", () => {
    // Every week of 2026, at four hours of the day, pressing for the other theme.
    for (let week = 0; week < 53; week++) {
      for (const hour of [1, 9, 15, 21]) {
        const now = Date.UTC(2026, 0, 1 + week * 7, hour);
        const theme = resolveTheme({ choice: null, now }) === "dark" ? "light" : "dark";
        const cookie = themeChoiceCookie(theme, now);
        if (cookie.action !== "set") throw new Error("A press for the other theme must set");
        expect(resolveTheme({ choice: null, now: cookie.choice.until })).toBe(theme);
        expectNoEarlierTurn(theme, now, cookie.choice.until);
      }
    }
  });

  it("deletes the cookie when the press comes back to Glasgow's own theme", () => {
    expect(themeChoiceCookie("light", solarNoon)).toEqual({ action: "delete" });
    expect(themeChoiceCookie("dark", civilDusk + MINUTE)).toEqual({ action: "delete" });
  });

  it("ends just after Glasgow turns, even a fraction of a second either side of a twilight", () => {
    // sunTimes and isGlasgowNight cross −6° up to about 0.5s apart, so a press
    // right at a twilight must still end at the one that turns Glasgow to the
    // chosen theme, not skip it or stop at the one that just passed.
    for (const month of [2, 5, 8, 11]) {
      const { civilDawn: dawn, civilDusk: dusk } = sunTimes({ year: 2026, month, day: 6 }, glasgow);
      if (dawn === null || dusk === null) throw new Error("No civil twilight in Glasgow");
      for (const twilight of [dawn, dusk]) {
        for (const offset of [-900, -400, -50, 0, 50, 400, 900]) {
          const now = twilight + offset;
          const theme = resolveTheme({ choice: null, now }) === "dark" ? "light" : "dark";
          const cookie = themeChoiceCookie(theme, now);
          if (cookie.action !== "set") throw new Error("A press for the other theme must set");
          expect(resolveTheme({ choice: null, now: cookie.choice.until })).toBe(theme);
          expect(cookie.choice.until).toBeGreaterThan(now);
          expectNoEarlierTurn(theme, now, cookie.choice.until);
        }
      }
    }
  });

  it("rounds Max-Age up to whole seconds, never ending the cookie early", () => {
    // Twilights are found to the second, so 1.5s before dusk is still day.
    const cookie = themeChoiceCookie("dark", civilDusk - 1500);
    expect(cookie).toMatchObject({
      action: "set",
      maxAge: Math.ceil((1500 + TWILIGHT_MARGIN_MS) / 1000),
    });
  });
});
