/** Glasgow, whose sun sets the theme and lights the landscape wherever the visitor is. */
export const glasgow = {
  /** Degrees north. */
  latitude: 55.8642,
  /** Degrees east, so west is negative. */
  longitude: -4.2518,
  timeZone: "Europe/London",
} as const;

export type Place = { latitude: number; longitude: number };
