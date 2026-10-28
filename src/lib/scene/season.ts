import { glasgowClock } from "../glasgow";

export type Season = "spring" | "summer" | "autumn" | "winter";

/** The season on Glasgow's calendar, by whole months: spring is March to May, and so on (DESIGN.md section 7). */
export function seasonOf(instant: number): Season {
  const { month } = glasgowClock(instant);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

/** The 15th of each season's middle month: a day whose sun is typical of the season. */
export const SEASON_MIDDLE_MONTH: Record<Season, number> = {
  winter: 1,
  spring: 4,
  summer: 7,
  autumn: 10,
};
