import { describe, expect, it } from "vitest";
import { glasgowClock } from "../../src/lib/glasgow";
import {
  darkHour,
  momentAt,
  type PlayState,
  playInstant,
  playReducer,
  playSky,
  playTheme,
} from "../../src/lib/scene/play";
import { seasonDay } from "../../src/lib/scene/season";
import { defaultSky } from "../../src/lib/scene/sky-state";

// 28 October, 15:00 in Glasgow (GMT).
const now = Date.parse("2026-10-28T15:00:00Z");
const live: PlayState = { status: "live" };
// The live sky on screen when a change happens.
const sky = { ...defaultSky(now), clouds: 3, rain: 1 };
// Playing, after a first change that keeps the live sky's clouds.
const playing = (from = sky) =>
  playReducer(live, { from, type: "level", level: "clouds", value: from.clouds });

describe("seasonDay", () => {
  it("keeps today for today's season and moves any other to its middle month's 15th", () => {
    expect(seasonDay("autumn", now)).toEqual({ year: 2026, month: 10, day: 28 });
    expect(seasonDay("summer", now)).toEqual({ year: 2026, month: 7, day: 15 });
    expect(seasonDay("winter", now)).toEqual({ year: 2026, month: 1, day: 15 });
  });
});

describe("playReducer", () => {
  it("starts playing on the first change, from the live sky at its Glasgow hour", () => {
    expect(playing()).toEqual({
      status: "playing",
      cause: "panel",
      season: "autumn",
      hour: 15,
      clouds: 3,
      rain: 1,
      wind: 0,
      snow: false,
      haar: false,
    });
  });

  it("applies the first change to the live sky", () => {
    expect(playReducer(live, { from: sky, type: "hour", hour: 4 })).toMatchObject({
      status: "playing",
      hour: 4,
      clouds: 3,
      rain: 1,
    });
  });

  it("keeps playing from its own sky, not the live one, after the first change", () => {
    const changed = playReducer(playing(), { from: sky, type: "hour", hour: 4 });
    const moved = { ...defaultSky(now + 3 * 3_600_000), clouds: 9 };
    expect(playReducer(changed, { from: moved, type: "level", level: "rain", value: 2 })).toEqual({
      ...changed,
      rain: 2,
    });
  });

  it("sets each value, clamped to its range", () => {
    let state = playing();
    state = playReducer(state, { from: sky, type: "season", season: "winter" });
    state = playReducer(state, { from: sky, type: "hour", hour: 30 });
    state = playReducer(state, { from: sky, type: "level", level: "rain", value: 8 });
    state = playReducer(state, { from: sky, type: "level", level: "wind", value: -2 });
    state = playReducer(state, { from: sky, type: "switch", name: "snow", on: true });
    state = playReducer(state, { from: sky, type: "switch", name: "haar", on: true });
    expect(state).toMatchObject({
      season: "winter",
      hour: 23,
      rain: 8,
      wind: 0,
      snow: true,
      haar: true,
      cause: "panel",
    });
  });

  it("stays live through a theme toggle, so opening the panel and pressing it is an ordinary toggle", () => {
    expect(playReducer(live, { type: "themeToggled", to: "dark", now })).toBe(live);
  });

  it("moves the time for the theme toggle: 13:00 for light, 22:00 for dark", () => {
    const light = playReducer(playing(), { type: "themeToggled", to: "light", now });
    const dark = playReducer(playing(), { type: "themeToggled", to: "dark", now });
    expect(light).toMatchObject({ hour: 13, cause: "toggle" });
    expect(dark).toMatchObject({ hour: 22, cause: "toggle" });
  });

  it("moves to the night's solar midnight for dark when 22:00 isn't night that summer day", () => {
    const summer = playReducer(playing(), { from: sky, type: "season", season: "summer" });
    const dark = playReducer(summer, { type: "themeToggled", to: "dark", now });
    expect(dark).toMatchObject({ hour: 1, cause: "toggle" });
    if (dark.status !== "playing") throw new Error("Not playing");
    expect(playTheme(dark, now)).toBe("dark");
  });

  it("goes back to live", () => {
    expect(playReducer(playing(), { type: "backToLive" })).toEqual(live);
  });
});

describe("the visitor's sky", () => {
  it("shows the slider's hour on the season's day, Glasgow time", () => {
    const state = playReducer(playing(), { from: sky, type: "hour", hour: 7 });
    if (state.status !== "playing") throw new Error("Not playing");
    expect(glasgowClock(playInstant(state, now))).toMatchObject({ month: 10, day: 28, hour: 7 });
    const summer = { ...state, season: "summer" as const, hour: 22 };
    expect(glasgowClock(playInstant(summer, now))).toMatchObject({ month: 7, day: 15, hour: 22 });
    expect(playSky(summer, now)).toMatchObject({ season: "summer", clouds: 3, rain: 1 });
  });

  it("is dark at night and light by day, and has no theme while live", () => {
    const day = playing();
    const night = playReducer(day, { from: sky, type: "hour", hour: 22 });
    expect(playTheme(day, now)).toBe("light");
    expect(playTheme(night, now)).toBe("dark");
    expect(playTheme(live, now)).toBeNull();
  });

  it("names the moment nearest the slider's hour", () => {
    const at = (hour: number, season: "autumn" | "summer" = "autumn") => {
      const state = playReducer(playReducer(playing(), { from: sky, type: "season", season }), {
        from: sky,
        type: "hour",
        hour,
      });
      if (state.status !== "playing") throw new Error("Not playing");
      return momentAt(state, now);
    };
    expect(at(13)).toBe("day");
    expect(at(22)).toBe("night");
    expect(at(22, "summer")).toBe("golden");
  });
});

describe("darkHour", () => {
  it("is 22:00 when that's night, and near solar midnight in midsummer", () => {
    expect(darkHour({ year: 2026, month: 10, day: 28 })).toBe(22);
    expect(darkHour({ year: 2026, month: 6, day: 21 })).toBe(1);
  });
});
