import { useEffect, useState } from "react";
import { sceneInstant } from "../../lib/scene/moment";
import { defaultSky, type SkyState } from "../../lib/scene/sky-state";
import type { LiveWeather } from "../../lib/weather/weather";
import { useNow } from "../clock/Clock";
import { useTheme } from "../theme/Theme";
import { Landscape } from "./Landscape";

// How long the landscape's half of a theme toggle runs (DESIGN.md section 6).
// Keep in step with the glow's animation in src/styles/landscape.css.
const CHOREOGRAPHY_MS = 1700;

type Choreography = "sunset" | "sunrise" | null;

type Props = {
  /** The sky `?sky=` fixes, which then holds still, or null. */
  override: SkyState | null;
  /** Glasgow's live weather, once it arrives. */
  weather: LiveWeather | null;
};

/** The landscape in the hero, fed by the page's clock, theme and weather. */
export function HeroLandscape({ override, weather }: Props) {
  const now = useNow();
  const { theme, change } = useTheme();

  const live = defaultSky(now);
  const sky = override ?? (weather ? { ...live, ...weather } : live);
  const at = override ? override.at.getTime() : sceneInstant(now, theme);

  // A toggle starts the landscape's sunset or sunrise; the new `change` object
  // is the signal, so a second press restarts it.
  const [choreography, setChoreography] = useState<Choreography>(null);
  const [seenChange, setSeenChange] = useState(change);
  if (change !== seenChange) {
    setSeenChange(change);
    if (change?.kind === "toggle") setChoreography(theme === "dark" ? "sunset" : "sunrise");
  }
  useEffect(() => {
    if (!choreography) return;
    const timer = setTimeout(() => setChoreography(null), CHOREOGRAPHY_MS);
    return () => clearTimeout(timer);
  }, [choreography]);

  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const sync = () => setPaused(document.visibilityState === "hidden");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return <Landscape sky={sky} at={at} choreography={choreography} paused={paused} />;
}
