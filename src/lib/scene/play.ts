/*
 * Play with the sky (DESIGN.md section 8): the visitor's own sky, which
 * replaces the live one until they go back to live or reload. One reducer
 * holds it, so the gear, the panel, the chip, the landscape and the theme all
 * read the same state. Nothing is stored.
 */

import { type Day, glasgow, glasgowClock, glasgowInstant } from "../glasgow";
import { sunTimes } from "../sun";
import { isGlasgowNight, type Theme } from "../theme";
import { glasgowElevation, skyMix } from "./moment";
import type { Moment } from "./palette";
import { type Season, seasonDay } from "./season";
import type { SkyState } from "./sky-state";

const HOUR = 3_600_000;

type PlaySky = {
  season: Season;
  /** The slider's whole hour, 0–23, Glasgow time. */
  hour: number;
  clouds: number;
  rain: number;
  wind: number;
  snow: boolean;
  haar: boolean;
};

export type PlayState =
  | { status: "live" }
  | ({
      status: "playing";
      /**
       * What last moved the sky: a slider or switch, or the theme toggle. A
       * theme change caused by a slider is quiet; only the toggle runs the
       * landscape's sunset or sunrise.
       */
      cause: "panel" | "toggle";
    } & PlaySky);

export type PlayAction =
  /** Starts playing from the sky on screen. */
  | { type: "play"; from: SkyState }
  | { type: "season"; season: Season }
  | { type: "hour"; hour: number }
  | { type: "level"; level: "clouds" | "rain" | "wind"; value: number }
  | { type: "switch"; name: "snow" | "haar"; on: boolean }
  /** The theme toggle while playing: it moves the time instead of storing a choice. */
  | { type: "themeToggled"; to: Theme; now: number }
  | { type: "backToLive" };

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, Math.round(value)));

export function playReducer(state: PlayState, action: PlayAction): PlayState {
  if (action.type === "play") {
    if (state.status === "playing") return state;
    const { season, clouds, rain, wind, snow, haar, at } = action.from;
    const { hour } = glasgowClock(at.getTime());
    return { status: "playing", cause: "panel", season, hour, clouds, rain, wind, snow, haar };
  }
  if (action.type === "backToLive") return { status: "live" };
  if (state.status === "live") return state;

  switch (action.type) {
    case "season":
      return { ...state, cause: "panel", season: action.season };
    case "hour":
      return { ...state, cause: "panel", hour: clamp(action.hour, 23) };
    case "level":
      return { ...state, cause: "panel", [action.level]: clamp(action.value, 10) };
    case "switch":
      return { ...state, cause: "panel", [action.name]: action.on };
    case "themeToggled": {
      const day = seasonDay(state.season, action.now);
      return { ...state, cause: "toggle", hour: action.to === "light" ? 13 : darkHour(day) };
    }
    default: {
      const unhandled: never = action;
      throw new Error(String(unhandled));
    }
  }
}

/** The instant the visitor's sky shows: the slider's hour, Glasgow time, on the season's day. */
export function playInstant(state: PlaySky, now: number): number {
  return glasgowInstant(seasonDay(state.season, now), state.hour, 0);
}

/** The visitor's sky as the landscape takes it. */
export function playSky(state: PlaySky, now: number): SkyState {
  const { season, clouds, rain, wind, snow, haar } = state;
  return { season, at: new Date(playInstant(state, now)), clouds, rain, wind, snow, haar };
}

/** The theme while playing: night is dark. Null while live. */
export function playTheme(state: PlayState, now: number): Theme | null {
  if (state.status === "live") return null;
  return isGlasgowNight(playInstant(state, now)) ? "dark" : "light";
}

/**
 * The hour the theme toggle moves to for dark: 22:00, or, on a summer day
 * when 22:00 isn't night in Glasgow, the whole hour nearest that night's solar
 * midnight, the darkest it gets (the same moment the landscape shows for a
 * dark theme by day).
 */
export function darkHour(day: Day): number {
  if (isGlasgowNight(glasgowInstant(day, 22, 0))) return 22;
  const midnight = sunTimes(day, glasgow).solarNoon + 12 * HOUR;
  const { hour, minute } = glasgowClock(midnight);
  return (hour + (minute >= 30 ? 1 : 0)) % 24;
}

/** The moment of the day nearest the slider's hour, for its label ("15:00 · day"). */
export function momentAt(state: PlaySky, now: number): Moment {
  const { from, to, mix } = skyMix(glasgowElevation(playInstant(state, now)));
  return mix < 0.5 ? from : to;
}
