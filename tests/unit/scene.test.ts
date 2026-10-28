import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addDays, glasgow, glasgowClock, glasgowInstant } from "../../src/lib/glasgow";
import { effects } from "../../src/lib/scene/effects";
import {
  auroraHour,
  glasgowElevation,
  herdBrightness,
  orbs,
  sceneInstant,
  skyMix,
  starsVisibility,
} from "../../src/lib/scene/moment";
import { clouds, herdCow, land, mixHex, particles, skyMoments } from "../../src/lib/scene/palette";
import { seasonOf } from "../../src/lib/scene/season";
import { defaultSky, skyFromOverride } from "../../src/lib/scene/sky-state";
import { sunTimes } from "../../src/lib/sun";

const HOUR = 3_600_000;
const at = (iso: string) => Date.parse(iso);

describe("Glasgow's clock", () => {
  it("reads summer time and winter time", () => {
    expect(glasgowClock(at("2026-07-15T21:00:00Z"))).toMatchObject({ hour: 22, minute: 0 });
    expect(glasgowClock(at("2026-01-15T22:00:00Z"))).toMatchObject({ hour: 22, minute: 0 });
  });

  it("turns a Glasgow time back into the instant", () => {
    expect(glasgowInstant({ year: 2026, month: 7, day: 15 }, 22, 0)).toBe(
      at("2026-07-15T21:00:00Z"),
    );
    expect(glasgowInstant({ year: 2026, month: 1, day: 15 }, 22, 0)).toBe(
      at("2026-01-15T22:00:00Z"),
    );
  });

  it("crosses month and year ends", () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({
      year: 2027,
      month: 1,
      day: 1,
    });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    });
  });
});

describe("seasonOf", () => {
  it.each([
    ["2026-02-28T23:30:00Z", "winter"],
    ["2026-03-01T00:30:00Z", "spring"],
    ["2026-05-31T22:30:00Z", "spring"],
    // 31 May 23:30 UTC is 1 June 00:30 in Glasgow.
    ["2026-05-31T23:30:00Z", "summer"],
    ["2026-08-31T22:30:00Z", "summer"],
    ["2026-08-31T23:30:00Z", "autumn"],
    ["2026-11-30T23:30:00Z", "autumn"],
    ["2026-12-01T00:30:00Z", "winter"],
  ])("puts %s in %s, on Glasgow's calendar", (iso, season) => {
    expect(seasonOf(at(iso))).toBe(season);
  });
});

describe("skyMix", () => {
  it("is full night at or below −12° and full day above 20°", () => {
    expect(skyMix(-30)).toEqual({ from: "night", to: "night", mix: 0, landLight: 0 });
    expect(skyMix(-12)).toEqual({ from: "night", to: "night", mix: 0, landLight: 0 });
    expect(skyMix(45)).toEqual({ from: "day", to: "day", mix: 0, landLight: 1 });
  });

  it("mixes the neighbouring moments in between", () => {
    expect(skyMix(-8)).toMatchObject({ from: "night", to: "blue", mix: 0.5, landLight: 0.075 });
    expect(skyMix(-2)).toMatchObject({ from: "blue", to: "golden", mix: 0.5 });
    expect(skyMix(3)).toMatchObject({ from: "golden", to: "morning", mix: 0.5, landLight: 0.75 });
  });

  it("puts Glasgow's winter solar noon, about 11°, between morning and day", () => {
    const { solarNoon } = sunTimes({ year: 2026, month: 12, day: 21 }, glasgow);
    const elevation = glasgowElevation(solarNoon);
    expect(elevation).toBeGreaterThan(10);
    expect(elevation).toBeLessThan(12);
    expect(skyMix(elevation)).toMatchObject({ from: "morning", to: "day" });
  });

  it("never reaches full night at midsummer", () => {
    const { solarNoon } = sunTimes({ year: 2026, month: 6, day: 21 }, glasgow);
    const lowest = glasgowElevation(solarNoon + 12 * HOUR);
    expect(lowest).toBeGreaterThan(-12);
    expect(skyMix(lowest)).toMatchObject({ from: "night", to: "blue" });
    expect(skyMix(lowest).mix).toBeGreaterThan(0);
  });
});

describe("the light on the herd and the stars", () => {
  it("darkens the herd at night and in the blue and golden moments", () => {
    expect(herdBrightness(-20)).toBe(0.62);
    expect(herdBrightness(-2)).toBe(0.82);
    expect(herdBrightness(10)).toBe(1);
  });

  it("shows the stars only below the horizon", () => {
    expect(starsVisibility(-15)).toBe(1);
    expect(starsVisibility(-6)).toBe(0.5);
    expect(starsVisibility(5)).toBe(0);
  });
});

describe("orbs", () => {
  const day = { year: 2026, month: 10, day: 15 };
  const times = sunTimes(day, glasgow);
  const { sunrise, sunset, solarNoon } = times;
  if (sunrise === null || sunset === null) throw new Error("No sunrise in Glasgow");

  it("puts the sun on the horizon at sunrise and sunset and highest at solar noon", () => {
    expect(orbs(sunrise + 1000).sun).toMatchObject({ up: true });
    expect(orbs(sunrise + 1000).sun.x).toBeCloseTo(150, 0);
    expect(orbs(sunset - 1000).sun.x).toBeCloseTo(1050, 0);
    const noon = orbs((sunrise + sunset) / 2).sun;
    expect(noon.x).toBeCloseTo(600, 0);
    expect(noon.y).toBeCloseTo(45, 0);
    expect(orbs(solarNoon).moon.up).toBe(false);
  });

  it("keeps the sun down at night, at the end it set or will rise at", () => {
    expect(orbs(sunset + HOUR).sun).toEqual({ x: 1050, y: 210, up: false });
    expect(orbs(sunrise - HOUR).sun).toEqual({ x: 150, y: 210, up: false });
  });

  it("carries the moon across the night, after midnight too", () => {
    const evening = orbs(sunset + HOUR).moon;
    const halfPast = orbs(glasgowInstant(addDays(day, 1), 0, 30)).moon;
    const five = orbs(glasgowInstant(addDays(day, 1), 5, 0)).moon;
    expect(evening.up && halfPast.up && five.up).toBe(true);
    expect(evening.x).toBeLessThan(halfPast.x);
    expect(halfPast.x).toBeLessThan(five.x);
    expect(halfPast.y).toBeLessThan(80);
  });
});

describe("sceneInstant", () => {
  const noonish = glasgowInstant({ year: 2026, month: 6, day: 21 }, 14, 0);
  const night = glasgowInstant({ year: 2026, month: 1, day: 15 }, 23, 0);

  it("shows Glasgow's real time when the theme agrees with its sky", () => {
    expect(sceneInstant(noonish, "light")).toBe(noonish);
    expect(sceneInstant(night, "dark")).toBe(night);
  });

  it("shows today's solar noon for light at night", () => {
    const { solarNoon } = sunTimes({ year: 2026, month: 1, day: 15 }, glasgow);
    expect(sceneInstant(night, "light")).toBe(solarNoon);
  });

  it("shows that night's solar midnight for dark by day, the darkest a June night gets", () => {
    const { solarNoon } = sunTimes({ year: 2026, month: 6, day: 21 }, glasgow);
    const shown = sceneInstant(noonish, "dark");
    expect(shown).toBe(solarNoon + 12 * HOUR);
    // About −10.7°: never full night, and darker than 22:00's golden hour.
    expect(glasgowElevation(shown)).toBeCloseTo(-10.7, 0);
    expect(glasgowElevation(shown)).toBeLessThan(
      glasgowElevation(glasgowInstant({ year: 2026, month: 6, day: 21 }, 22, 0)),
    );
  });
});

describe("auroraHour", () => {
  it("is from 21:00 to 01:00, Glasgow time", () => {
    const hour = (h: number) =>
      auroraHour(glasgowInstant({ year: 2026, month: 1, day: 15 }, h, 30));
    expect([20, 21, 23, 0, 1].map(hour)).toEqual([false, true, true, true, false]);
  });
});

describe("effects", () => {
  const calm = { clouds: 0, rain: 0, wind: 0, snow: false, haar: false };

  it("is a clear sky at 0", () => {
    expect(effects(calm)).toEqual({
      clouds: 0,
      visibleClouds: 0,
      darkClouds: false,
      backDeck: 0,
      frontDeck: 0,
      cloudGrey: 0,
      rainGrey: 0,
      orb: 1,
      stars: 1,
      ripples: 0,
      cloudSpeed: 1,
      swaySeconds: 5,
      swayHard: false,
      snowCover: false,
      haar: false,
    });
  });

  it("follows the table at 5", () => {
    const five = effects({ ...calm, clouds: 5, wind: 5 });
    expect(five).toMatchObject({ visibleClouds: 7, darkClouds: false, backDeck: 0, orb: 1 });
    expect(five.cloudGrey).toBeCloseTo(0.175);
    expect(five.stars).toBeCloseTo(0.375);
    expect(five.cloudSpeed).toBeCloseTo(3.25);
    expect(five.swaySeconds).toBeCloseTo(2.75);
    expect(five.swayHard).toBe(true);
  });

  it("follows the table at 10", () => {
    const ten = effects({ ...calm, clouds: 10, rain: 10, wind: 10 });
    expect(ten).toMatchObject({ visibleClouds: 13, darkClouds: true, backDeck: 1, stars: 0 });
    expect(ten.frontDeck).toBeCloseTo(0.9);
    expect(ten.rainGrey).toBeCloseTo(0.4);
    expect(ten.orb).toBe(0);
    expect(ten.ripples).toBeCloseTo(0.9);
    expect(ten.swaySeconds).toBe(0.9);
  });

  it("starts the darker clouds and the back deck at 6", () => {
    expect(effects({ ...calm, clouds: 6 })).toMatchObject({ darkClouds: true });
    expect(effects({ ...calm, clouds: 6 }).backDeck).toBeCloseTo(0.2);
    expect(effects({ ...calm, clouds: 5 }).darkClouds).toBe(false);
  });

  it("raises the cloud level with rain, which drives every cloud effect", () => {
    const drizzle = effects({ ...calm, clouds: 1, rain: 4 });
    expect(drizzle.clouds).toBe(7);
    expect(drizzle).toMatchObject({ visibleClouds: 9, darkClouds: true });
    expect(drizzle.cloudGrey).toBeCloseTo(0.245);
  });

  it("multiplies the cloud and rain fades of the sun or moon", () => {
    const grey = effects({ ...calm, clouds: 8, rain: 2 });
    expect(grey.orb).toBeCloseTo((1 - 2 / 3.5) * 0.5);
  });

  it("ripples the loch only when it rains", () => {
    expect(effects({ ...calm, rain: 1 }).ripples).toBeCloseTo(0.45);
  });

  it("settles snow from level 3", () => {
    expect(effects({ ...calm, rain: 2, snow: true }).snowCover).toBe(false);
    expect(effects({ ...calm, rain: 3, snow: true }).snowCover).toBe(true);
  });
});

describe("skyFromOverride", () => {
  const now = at("2026-10-28T14:00:00Z");

  it("is ignored without SCENE_OVERRIDE", () => {
    expect(skyFromOverride({ param: "winter,22:00,clouds=3", enabled: false, now })).toBeNull();
  });

  it("is ignored when it names nothing it knows", () => {
    expect(skyFromOverride({ param: undefined, enabled: true, now })).toBeNull();
    expect(skyFromOverride({ param: "", enabled: true, now })).toBeNull();
    expect(skyFromOverride({ param: "sunny,99:99", enabled: true, now })).toBeNull();
  });

  it("moves a season to the 15th of its middle month, at Glasgow's time", () => {
    const sky = skyFromOverride({ param: "winter,22:00,clouds=1", enabled: true, now });
    expect(sky).toMatchObject({ season: "winter", clouds: 1, rain: 0, snow: false });
    expect(sky?.at.toISOString()).toBe("2026-01-15T22:00:00.000Z");
    const summer = skyFromOverride({ param: "summer,22:00", enabled: true, now });
    expect(summer?.at.toISOString()).toBe("2026-07-15T21:00:00.000Z");
  });

  it("keeps today and the current season when only the weather is set", () => {
    const sky = skyFromOverride({ param: "rain=4,wind=12,snow,haar", enabled: true, now });
    expect(sky).toEqual({ ...defaultSky(now), rain: 4, wind: 10, snow: true, haar: true });
  });
});

describe("the landscape palettes", () => {
  const palettes = JSON.parse(readFileSync("docs/design/landscape-palettes.json", "utf8"));

  it("match the reference file", () => {
    expect(skyMoments).toEqual(palettes.skyKeys);
    expect(land).toEqual(palettes.land);
    expect(clouds).toEqual(palettes.clouds);
    expect(herdCow).toEqual(palettes.herdCow);
    expect(particles).toEqual(palettes.particles);
  });

  it("mix two colours", () => {
    expect(mixHex("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mixHex("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(mixHex("#0E1A24", "#CFE4EC", 1)).toBe("#CFE4EC");
  });
});
