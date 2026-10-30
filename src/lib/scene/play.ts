/*
 * Play with the sky (DESIGN.md section 8): the visitor's own sky, which
 * replaces the live one until they go back to live or reload. One reducer
 * holds it, so the gear, the panel, the chip, the landscape and the theme all
 * read the same state. Nothing is stored. Opening the panel changes nothing:
 * playing starts with the first change to a control, from the live sky at
 * that moment.
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

/** A change to one of the panel's controls. */
export type PanelControl =
  | { type: "season"; season: Season }
  | { type: "hour"; hour: number }
  | { type: "level"; level: "clouds" | "rain" | "wind"; value: number }
  | { type: "switch"; name: "snow" | "haar"; on: boolean };

/** `from` is the live sky on screen when the change happens: the first one starts playing from it. */
type PanelChange = PanelControl & { from: SkyState };

export type PlayAction =
  | PanelChange
  /** The theme toggle while playing: it moves the time instead of storing a choice. */
  | { type: "themeToggled"; to: Theme; now: number }
  | { type: "backToLive" };

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, Math.round(value)));

/** The panel's controls set to a sky: the live one, before the first change. */
export function panelSky(sky: SkyState): PlaySky {
  const { season, clouds, rain, wind, snow, haar, at } = sky;
  return { season, hour: glasgowClock(at.getTime()).hour, clouds, rain, wind, snow, haar };
}

export function playReducer(state: PlayState, action: PlayAction): PlayState {
  if (action.type === "backToLive") return { status: "live" };
  if (action.type === "themeToggled") {
    // The toggle only moves the visitor's time while playing; live, it's an ordinary toggle.
    if (state.status === "live") return state;
    const day = seasonDay(state.season, action.now);
    return { ...state, cause: "toggle", hour: action.to === "light" ? 13 : darkHour(day) };
  }

  const sky = state.status === "playing" ? state : panelSky(action.from);
  const playing = { ...sky, status: "playing", cause: "panel" } as const;
  switch (action.type) {
    case "season":
      return { ...playing, season: action.season };
    case "hour":
      return { ...playing, hour: clamp(action.hour, 23) };
    case "level":
      return { ...playing, [action.level]: clamp(action.value, 10) };
    case "switch":
      return { ...playing, [action.name]: action.on };
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
