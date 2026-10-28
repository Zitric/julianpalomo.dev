import { describe, expect, it } from "vitest";
import { glasgow } from "../../src/lib/glasgow";
import { sunTimes } from "../../src/lib/sun";
import {
  isGlasgowNight,
  parseThemeCookie,
  resolveTheme,
  serializeThemeCookie,
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
  it("reads light and dark", () => {
    expect(parseThemeCookie("light")).toBe("light");
    expect(parseThemeCookie("dark")).toBe("dark");
  });

  it("treats a missing or unknown value as no choice", () => {
    expect(parseThemeCookie(undefined)).toBeNull();
    expect(parseThemeCookie("")).toBeNull();
    expect(parseThemeCookie("Dark")).toBeNull();
    expect(parseThemeCookie("system")).toBeNull();
  });
});

describe("serializeThemeCookie", () => {
  it("remembers the choice for a year on every path", () => {
    expect(serializeThemeCookie("dark", { secure: false })).toBe(
      "theme=dark; Max-Age=31536000; Path=/; SameSite=Lax",
    );
  });

  it("adds Secure over https", () => {
    expect(serializeThemeCookie("light", { secure: true })).toBe(
      "theme=light; Max-Age=31536000; Path=/; SameSite=Lax; Secure",
    );
  });

  it("writes what parseThemeCookie reads back", () => {
    const value = serializeThemeCookie("dark", { secure: false }).split(";")[0]?.split("=")[1];
    expect(parseThemeCookie(value)).toBe("dark");
  });
});
