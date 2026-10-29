import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { forgetChoice, rememberChoice } from "../../lib/cookie";
import type { Locale } from "../../lib/i18n/locale";
import { playTheme } from "../../lib/scene/play";
import {
  resolveTheme,
  THEME_COOKIE,
  type Theme,
  type ThemeChoice,
  themeChoiceCookie,
} from "../../lib/theme";
import { useNow } from "../clock/Clock";
import { usePlay } from "../play/Play";

/**
 * A theme change in progress: the visitor pressed the toggle, Glasgow's dusk
 * or dawn arrived, or the gear's panel moved the sky across dusk or dawn. A
 * new object on every change, so a second press restarts the timer that ends
 * it. Only "toggle" runs the landscape's sunset or sunrise: with the panel,
 * the scene already follows the slider.
 */
type ThemeChange = { kind: "toggle" | "auto" | "panel" };

// How long <html data-theme-change> stays set: the UI colours' transition in
// src/styles/app.css. Keep the two in step.
const CHANGE_MS: Record<ThemeChange["kind"], number> = { toggle: 600, auto: 6000, panel: 600 };

type ThemeState = {
  /** The theme on screen. */
  theme: Theme;
  /** The visitor's choice while it lasts, or null while the theme follows Glasgow. */
  choice: Theme | null;
  /** What Glasgow's sun says right now, whatever the visitor chose. */
  glasgowTheme: Theme;
  /** The change running now, if any. The landscape's sunset and sunrise start from it. */
  change: ThemeChange | null;
  /** The theme follows the visitor's own sky from the gear, not their choice or Glasgow. */
  fromToy: boolean;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

type Props = {
  /** The choice in the `theme` cookie as the server read it. */
  initialChoice: ThemeChoice | null;
  /** The page's language, for <html lang>. */
  lang: Locale;
  /** The document's <head> and <body>. */
  children: ReactNode;
};

/** The <html> element, with the theme the server resolved and the client keeps current. */
export function ThemeDocument({ initialChoice, lang, children }: Props) {
  const now = useNow();
  const [choice, setChoice] = useState(initialChoice);
  const [change, setChange] = useState<ThemeChange | null>(null);
  const { state: play, dispatch } = usePlay();
  const glasgowTheme = resolveTheme({ choice: null, now });
  // A choice lasts until Glasgow's next dusk or dawn: the minute clock ends it,
  // as the cookie's Max-Age does. It ends when Glasgow comes round to the same
  // theme, so its end never changes the theme on screen.
  const chosen = choice !== null && now < choice.until ? choice.theme : null;
  // While playing, the visitor's own sky sets the theme (night is dark), and
  // the choice is left alone for when they go back to live.
  const toyTheme = playTheme(play, now);
  const theme = toyTheme ?? chosen ?? glasgowTheme;

  // The theme changed without a press of the toggle: Glasgow's dusk or dawn
  // arrived while it follows Glasgow, or the panel moved the sky (or the
  // visitor left it). The toggle marks its own change.
  const [previous, setPrevious] = useState({ theme, toy: toyTheme !== null });
  const [toggled, setToggled] = useState(false);
  if (previous.theme !== theme) {
    setPrevious({ theme, toy: toyTheme !== null });
    if (toggled) setToggled(false);
    else setChange({ kind: toyTheme !== null || previous.toy ? "panel" : "auto" });
  }

  useEffect(() => {
    if (!change) return;
    const timer = setTimeout(() => setChange(null), CHANGE_MS[change.kind]);
    return () => clearTimeout(timer);
  }, [change]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    // While playing, the toggle moves the visitor's time instead of storing a
    // choice (13:00 for light, the night for dark).
    if (play.status === "playing") dispatch({ type: "themeToggled", to: next, now });
    else {
      // Back to Glasgow's own theme ends the choice; any other lasts until
      // its next dusk or dawn. Date.now, not the minute clock, so the end is
      // exact.
      const cookie = themeChoiceCookie(next, Date.now());
      if (cookie.action === "delete") {
        forgetChoice(THEME_COOKIE);
        setChoice(null);
      } else {
        rememberChoice(THEME_COOKIE, cookie.value, cookie.maxAge);
        setChoice(cookie.choice);
      }
    }
    setChange({ kind: "toggle" });
    setToggled(true);
  };

  return (
    <ThemeContext
      value={{ theme, choice: chosen, glasgowTheme, change, fromToy: toyTheme !== null, toggle }}
    >
      <html lang={lang} data-theme={theme} data-theme-change={change?.kind}>
        {children}
      </html>
    </ThemeContext>
  );
}

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext);
  if (!state) throw new Error("useTheme needs a ThemeDocument");
  return state;
}
