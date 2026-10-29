import { describe, expect, it } from "vitest";
import { glasgow } from "../../src/lib/glasgow";
import { sunTimes } from "../../src/lib/sun";
import {
  isGlasgowNight,
  parseThemeCookie,
  resolveTheme,
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

describe("themeChoiceCookie", () => {
  it("stores the other theme until Glasgow's next dusk or dawn", () => {
    expect(themeChoiceCookie("dark", solarNoon)).toEqual({
      action: "set",
      value: `dark.${civilDusk}`,
      maxAge: Math.ceil((civilDusk - solarNoon) / 1000),
      choice: { theme: "dark", until: civilDusk },
    });
  });

  it("deletes the cookie when the press comes back to Glasgow's own theme", () => {
    expect(themeChoiceCookie("light", solarNoon)).toEqual({ action: "delete" });
    expect(themeChoiceCookie("dark", civilDusk + MINUTE)).toEqual({ action: "delete" });
  });

  it("rounds Max-Age up, so a press seconds before the twilight still stores a live cookie", () => {
    // Twilights are found to the second, so 1.5s before dusk is still day.
    const cookie = themeChoiceCookie("dark", civilDusk - 1500);
    expect(cookie).toMatchObject({ action: "set", maxAge: 2 });
  });
});
