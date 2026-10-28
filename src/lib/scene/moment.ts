/*
 * The time of day in the landscape (DESIGN.md sections 6 and 7): which two
 * sky moments to mix, where the sun and the moon sit on their arcs, and the
 * moment shown when the chosen theme disagrees with Glasgow's real sky.
 */

import { addDays, glasgow, glasgowClock } from "../glasgow";
import { sunPosition, sunTimes } from "../sun";
import { resolveTheme, type Theme } from "../theme";
import type { Moment } from "./palette";

const HOUR = 3_600_000;

// The sun's elevation at which each moment is pure, and the land light there.
const STOPS: { elevation: number; moment: Moment; landLight: number }[] = [
  { elevation: -12, moment: "night", landLight: 0 },
  { elevation: -4, moment: "blue", landLight: 0.15 },
  { elevation: 0, moment: "golden", landLight: 0.6 },
  { elevation: 6, moment: "morning", landLight: 0.9 },
  { elevation: 20, moment: "day", landLight: 1 },
];

export type SkyMix = {
  from: Moment;
  to: Moment;
  /** How far from `from` to `to`, 0–1. */
  mix: number;
  /** The season's night land (0) to its day land (1). */
  landLight: number;
};

/** The two moments to mix at a given sun elevation, and the land light (the table in section 7). */
export function skyMix(elevation: number): SkyMix {
  const first = STOPS[0];
  const last = STOPS.at(-1);
  // STOPS is a non-empty literal, so both ends exist.
  if (!first || !last) throw new Error("No sky stops");
  if (elevation <= first.elevation) return { from: "night", to: "night", mix: 0, landLight: 0 };
  if (elevation >= last.elevation) return { from: "day", to: "day", mix: 0, landLight: 1 };
  for (let index = 1; index < STOPS.length; index++) {
    const low = STOPS[index - 1];
    const high = STOPS[index];
    if (low && high && elevation <= high.elevation) {
      const mix = (elevation - low.elevation) / (high.elevation - low.elevation);
      return {
        from: low.moment,
        to: high.moment,
        mix,
        landLight: low.landLight + (high.landLight - low.landLight) * mix,
      };
    }
  }
  return { from: "day", to: "day", mix: 0, landLight: 1 };
}

/** Linear from `a` at `from` to `b` at `to`, held outside that range. */
function ramp(value: number, from: number, to: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return a + (b - a) * t;
}

/** The herd's brightness: 0.62 at night, 0.82 through the blue and golden moments, 1 by day. */
export function herdBrightness(elevation: number): number {
  if (elevation < -4) return ramp(elevation, -12, -4, 0.62, 0.82);
  if (elevation < 3) return 0.82;
  return ramp(elevation, 3, 6, 0.82, 1);
}

/** How much of the night sky's stars show before clouds: all below −12°, none from 0°. */
export function starsVisibility(elevation: number): number {
  return ramp(elevation, -12, 0, 1, 0);
}

/** A point in the SVG's 1200 × 320 viewBox, and whether the orb is above the hills. */
export type OrbPosition = { x: number; y: number; up: boolean };

/** Along an arc from `x0` to `x1`, from y 210 at the horizon to `peak` halfway. */
function arc(t: number, x0: number, x1: number, peak: number): { x: number; y: number } {
  const height = 1 - (2 * t - 1) ** 2;
  return { x: x0 + (x1 - x0) * t, y: 210 - (210 - peak) * height };
}

function between(at: number, start: number | null, end: number | null): number | null {
  if (start === null || end === null || at < start || at > end) return null;
  return (at - start) / (end - start);
}

/**
 * Where the sun and the moon are at `at`. The sun crosses from sunrise (x 150)
 * to sunset (x 1050), peaking at y 45; the moon crosses the night from x 200
 * to x 1000, peaking at y 60. Outside its own arc an orb is down, at the end
 * it went down at.
 */
export function orbs(at: number): { sun: OrbPosition; moon: OrbPosition } {
  const today = glasgowClock(at);
  const times = sunTimes(today, glasgow);
  const sunT = between(at, times.sunrise, times.sunset);
  const sunEnd = at < times.solarNoon ? 150 : 1050;
  const sun =
    sunT === null ? { x: sunEnd, y: 210, up: false } : { ...arc(sunT, 150, 1050, 45), up: true };

  // Before today's sunrise the night began at yesterday's sunset; after
  // today's sunset it runs to tomorrow's sunrise.
  const night =
    at < times.solarNoon
      ? [sunTimes(addDays(today, -1), glasgow).sunset, times.sunrise]
      : [times.sunset, sunTimes(addDays(today, 1), glasgow).sunrise];
  const moonT = between(at, night[0] ?? null, night[1] ?? null);
  const moonEnd = at < times.solarNoon ? 1000 : 200;
  const moon =
    moonT === null ? { x: moonEnd, y: 210, up: false } : { ...arc(moonT, 200, 1000, 60), up: true };

  return { sun, moon };
}

/**
 * The moment the landscape shows. Normally Glasgow's real time; when the
 * chosen theme disagrees with Glasgow's sky, a representative moment instead
 * (DESIGN.md section 6): today's solar noon for light, and that night's solar
 * midnight, the darkest Glasgow gets, for dark.
 */
export function sceneInstant(now: number, theme: Theme): number {
  if (theme === resolveTheme({ choice: null, now })) return now;
  const { solarNoon } = sunTimes(glasgowClock(now), glasgow);
  return theme === "light" ? solarNoon : solarNoon + 12 * HOUR;
}

/** The sun's apparent elevation over Glasgow at `at`. */
export function glasgowElevation(at: number): number {
  return sunPosition(at, glasgow).elevation;
}

/** The aurora shows on clear winter nights from 21:00 to 01:00, Glasgow time. */
export function auroraHour(at: number): boolean {
  const { hour } = glasgowClock(at);
  return hour >= 21 || hour === 0;
}
