import { z } from "zod";
import { glasgow } from "./glasgow";
import { sunPosition } from "./sun";
import { nextTwilight } from "./twilight";

const themeSchema = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof themeSchema>;

/** A visitor's press of the toggle: a theme, until Glasgow's next dusk or dawn after the press. */
export type ThemeChoice = { theme: Theme; until: number };

/** Night in Glasgow runs from civil dusk to civil dawn: the sun more than 6° below the horizon. */
export function isGlasgowNight(now: number): boolean {
  return sunPosition(now, glasgow).elevation < -6;
}

/** The visitor's choice wins while it lasts; without one, the theme follows Glasgow's sun. */
export function resolveTheme({ choice, now }: { choice: Theme | null; now: number }): Theme {
  if (choice) return choice;
  return isGlasgowNight(now) ? "dark" : "light";
}

export const THEME_COOKIE = "theme";

// `dark.1761789000000`: the theme, then the end of the choice in epoch ms.
const cookieSchema = z
  .string()
  .regex(/^(light|dark)\.\d{1,16}$/)
  .transform((value) => {
    const [theme, until] = value.split(".");
    return { theme: themeSchema.parse(theme), until: Number(until) };
  });

/**
 * The choice the `theme` cookie holds at `now`, or null when it's missing,
 * malformed, from the old one-year format without an end (a plain `dark`),
 * or over.
 */
export function parseThemeCookie(value: unknown, now: number): ThemeChoice | null {
  const parsed = cookieSchema.safeParse(value);
  if (!parsed.success || parsed.data.until <= now) return null;
  return parsed.data;
}

// The rare day with no twilight ahead can't happen at Glasgow's latitude;
// should it, a choice still ends half a day later.
const FALLBACK_MS = 12 * 60 * 60 * 1000;

/**
 * How long after the twilight a choice ends. nextTwilight finds it with
 * sunTimes, but the theme follows isGlasgowNight, whose elevation crosses −6°
 * up to about 0.5s away from that instant. Ending exactly at the twilight
 * could leave a moment where the choice is over and Glasgow hasn't turned
 * yet, so a minute tick or a request shows the old theme. Two minutes clear it.
 */
export const TWILIGHT_MARGIN_MS = 2 * 60 * 1000;

// The same mismatch the other way: sunTimes can put a twilight a fraction of
// a second before `now` while isGlasgowNight hasn't turned yet. Looking from
// a second earlier keeps that twilight in view.
const TWILIGHT_TOLERANCE_MS = 1000;

/**
 * When a choice of `theme` made at `now` ends: just after the next twilight
 * that turns Glasgow to `theme`, checked with the same isGlasgowNight the
 * theme follows, so its end never changes the theme on screen.
 */
function choiceEnd(theme: Theme, now: number): number {
  let from = now - TWILIGHT_TOLERANCE_MS;
  for (let tries = 0; tries < 3; tries++) {
    const twilight = nextTwilight(from);
    if (twilight === null) break;
    const end = twilight + TWILIGHT_MARGIN_MS;
    if (resolveTheme({ choice: null, now: end }) === theme) return end;
    from = twilight;
  }
  return now + FALLBACK_MS;
}

/**
 * What pressing the toggle for `theme` at `now` stores. Back to Glasgow's own
 * theme ends the choice: the cookie is deleted. Otherwise the choice lasts
 * until Glasgow's next dusk or dawn, and TWILIGHT_MARGIN_MS more, and so does
 * the cookie: its `maxAge`, in whole seconds rounded up and never under 1,
 * ends it then, never before.
 */
export function themeChoiceCookie(
  theme: Theme,
  now: number,
): { action: "delete" } | { action: "set"; value: string; maxAge: number; choice: ThemeChoice } {
  if (theme === resolveTheme({ choice: null, now })) return { action: "delete" };
  const until = choiceEnd(theme, now);
  return {
    action: "set",
    value: `${theme}.${until}`,
    maxAge: Math.max(1, Math.ceil((until - now) / 1000)),
    choice: { theme, until },
  };
}
