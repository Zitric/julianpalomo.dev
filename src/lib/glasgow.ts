/** Glasgow, whose sun sets the theme and lights the landscape wherever the visitor is. */
export const glasgow = {
  /** Degrees north. */
  latitude: 55.8642,
  /** Degrees east, so west is negative. */
  longitude: -4.2518,
  timeZone: "Europe/London",
} as const;

export type Place = { latitude: number; longitude: number };

/** A calendar day: `month` runs from 1 to 12. */
export type Day = { year: number; month: number; day: number };

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: glasgow.timeZone,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

/** The date and time on a Glasgow clock at `instant`, whatever the server's or visitor's zone. */
export function glasgowClock(instant: number): Day & { hour: number; minute: number } {
  const values = Object.fromEntries(
    parts.formatToParts(instant).map(({ type, value }) => [type, Number(value)]),
  );
  return {
    year: values.year ?? 0,
    month: values.month ?? 0,
    day: values.day ?? 0,
    hour: values.hour ?? 0,
    minute: values.minute ?? 0,
  };
}

/** The day `offset` days after `day` (negative for before). */
export function addDays(day: Day, offset: number): Day {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + offset));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/** The instant a Glasgow clock shows `hour:minute` on `day`, summer time included. */
export function glasgowInstant(day: Day, hour: number, minute: number): number {
  const asUtc = Date.UTC(day.year, day.month - 1, day.day, hour, minute);
  // Glasgow is UTC or one hour ahead: read its clock at the UTC guess and
  // take the difference off.
  const shown = glasgowClock(asUtc);
  const shownAsUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute);
  return asUtc - (shownAsUtc - asUtc);
}
