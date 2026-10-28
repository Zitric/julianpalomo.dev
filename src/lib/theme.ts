import { z } from "zod";
import { glasgow } from "./glasgow";
import { sunPosition } from "./sun";

const themeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof themeSchema>;

/** Night in Glasgow runs from civil dusk to civil dawn: the sun more than 6° below the horizon. */
export function isGlasgowNight(now: number): boolean {
  return sunPosition(now, glasgow).elevation < -6;
}

/** The visitor's stored choice always wins; without one, the theme follows Glasgow's sun. */
export function resolveTheme({ choice, now }: { choice: Theme | null; now: number }): Theme {
  if (choice) return choice;
  return isGlasgowNight(now) ? "dark" : "light";
}

export const THEME_COOKIE = "theme";
const ONE_YEAR = 365 * 24 * 60 * 60;

/** The `theme` cookie's value, or null when it's missing or isn't a theme. */
export function parseThemeCookie(value: unknown): Theme | null {
  const parsed = themeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** A `document.cookie` assignment that remembers the choice for a year. */
export function serializeThemeCookie(theme: Theme, { secure }: { secure: boolean }): string {
  const attributes = [`${THEME_COOKIE}=${theme}`, `Max-Age=${ONE_YEAR}`, "Path=/", "SameSite=Lax"];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}
