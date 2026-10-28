import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { rememberChoice } from "../../lib/cookie";
import { resolveTheme, THEME_COOKIE, type Theme } from "../../lib/theme";
import { useNow } from "../clock/Clock";

/**
 * A theme change in progress: the visitor pressed the toggle, or Glasgow's
 * dusk or dawn arrived. A new object on every change, so a second press
 * restarts the timer that ends it.
 */
type ThemeChange = { kind: "toggle" | "auto" };

// How long <html data-theme-change> stays set: the UI colours' transition in
// src/styles/app.css. Keep the two in step.
const CHANGE_MS: Record<ThemeChange["kind"], number> = { toggle: 600, auto: 6000 };

type ThemeState = {
  /** The theme on screen. */
  theme: Theme;
  /** The visitor's stored choice, or null while the theme follows Glasgow. */
  choice: Theme | null;
  /** What Glasgow's sun says right now, whatever the visitor chose. */
  glasgowTheme: Theme;
  /** The change running now, if any. The landscape's sunset and sunrise start from it. */
  change: ThemeChange | null;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

type Props = {
  /** The `theme` cookie as the server read it. */
  initialChoice: Theme | null;
  /** The document's <head> and <body>. */
  children: ReactNode;
};

/** The <html> element, with the theme the server resolved and the client keeps current. */
export function ThemeDocument({ initialChoice, children }: Props) {
  const now = useNow();
  const [choice, setChoice] = useState(initialChoice);
  const [change, setChange] = useState<ThemeChange | null>(null);
  const glasgowTheme = resolveTheme({ choice: null, now });
  const theme = choice ?? glasgowTheme;

  // Glasgow's dusk or dawn arrived with the page open: changes the theme by
  // itself when the visitor hasn't chosen one.
  const [previousGlasgowTheme, setPreviousGlasgowTheme] = useState(glasgowTheme);
  if (previousGlasgowTheme !== glasgowTheme) {
    setPreviousGlasgowTheme(glasgowTheme);
    if (choice === null) setChange({ kind: "auto" });
  }

  useEffect(() => {
    if (!change) return;
    const timer = setTimeout(() => setChange(null), CHANGE_MS[change.kind]);
    return () => clearTimeout(timer);
  }, [change]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    rememberChoice(THEME_COOKIE, next);
    setChoice(next);
    setChange({ kind: "toggle" });
  };

  return (
    <ThemeContext value={{ theme, choice, glasgowTheme, change, toggle }}>
      <html lang="en" data-theme={theme} data-theme-change={change?.kind}>
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
