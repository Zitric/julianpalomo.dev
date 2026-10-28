import { glasgowClock, glasgowInstant } from "../glasgow";
import { SEASON_MIDDLE_MONTH, type Season, seasonOf } from "./season";

/** Everything the landscape shows: the season, the moment, and the weather. */
export type SkyState = {
  season: Season;
  /** The moment the scene shows. */
  at: Date;
  /** Weather levels, 0–10. */
  clouds: number;
  rain: number;
  wind: number;
  snow: boolean;
  haar: boolean;
};

/** Glasgow now, under a clear, calm sky. */
export function defaultSky(now: number): SkyState {
  return {
    season: seasonOf(now),
    at: new Date(now),
    clouds: 0,
    rain: 0,
    wind: 0,
    snow: false,
    haar: false,
  };
}

const SEASONS: readonly string[] = ["spring", "summer", "autumn", "winter"];
const isSeason = (token: string): token is Season => SEASONS.includes(token);
const LEVELS: readonly string[] = ["clouds", "rain", "wind"];
const isLevel = (key: string | undefined): key is "clouds" | "rain" | "wind" =>
  key !== undefined && LEVELS.includes(key);

/**
 * The sky asked for by `?sky=`, such as `winter,22:00,clouds=1,snow`, for
 * previews and tests. Null unless `enabled` (the `SCENE_OVERRIDE` variable)
 * and the value names at least one thing. A season moves the date to the 15th
 * of that season's middle month, so the sun matches it; a time is Glasgow's,
 * on that day. Levels are clamped to 0–10; unknown words are ignored.
 */
export function skyFromOverride({
  param,
  enabled,
  now,
}: {
  param: unknown;
  enabled: boolean;
  now: number;
}): SkyState | null {
  if (!enabled || typeof param !== "string" || param.trim() === "") return null;

  const sky = defaultSky(now);
  const today = glasgowClock(now);
  let day = { year: today.year, month: today.month, day: today.day };
  let time = { hour: today.hour, minute: today.minute };
  let matched = false;

  for (const raw of param.split(",")) {
    const token = raw.trim().toLowerCase();
    const [key, value] = token.split("=");
    const clock = /^(\d{1,2}):(\d{2})$/.exec(token);
    if (isSeason(token)) {
      sky.season = token;
      day = { year: today.year, month: SEASON_MIDDLE_MONTH[token], day: 15 };
    } else if (clock) {
      const hour = Number(clock[1]);
      const minute = Number(clock[2]);
      if (hour > 23 || minute > 59) continue;
      time = { hour, minute };
    } else if (key === "snow" || key === "haar") {
      sky[key] = value !== "0";
    } else if (isLevel(key) && value !== undefined) {
      const level = Number(value);
      if (!Number.isFinite(level)) continue;
      sky[key] = Math.min(10, Math.max(0, Math.round(level)));
    } else {
      continue;
    }
    matched = true;
  }

  if (!matched) return null;
  sky.at = new Date(glasgowInstant(day, time.hour, time.minute));
  return sky;
}
