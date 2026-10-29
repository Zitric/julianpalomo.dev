import { addDays, glasgow, glasgowClock } from "./glasgow";
import { sunTimes } from "./sun";

/**
 * Glasgow's next civil dawn or civil dusk strictly after `now`: the moment the
 * sun next crosses 6° below the horizon, the line `isGlasgowNight` draws. It
 * looks at Glasgow's calendar day at `now` and the day after, which always
 * holds the next one at Glasgow's latitude; null only if neither has one.
 */
export function nextTwilight(now: number): number | null {
  const { year, month, day } = glasgowClock(now);
  for (const offset of [0, 1]) {
    const { civilDawn, civilDusk } = sunTimes(addDays({ year, month, day }, offset), glasgow);
    for (const twilight of [civilDawn, civilDusk]) {
      if (twilight !== null && twilight > now) return twilight;
    }
  }
  return null;
}
