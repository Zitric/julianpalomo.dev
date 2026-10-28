import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { sceneInstant } from "../../lib/scene/moment";
import { defaultSky, skyFromOverride } from "../../lib/scene/sky-state";
import { useNow } from "../clock/Clock";
import { useTheme } from "../theme/Theme";
import { Landscape } from "./Landscape";

const rootRoute = getRouteApi("__root__");

// How long the landscape's half of a theme toggle runs (DESIGN.md section 6).
// Keep in step with the glow's animation in src/styles/landscape.css.
const CHOREOGRAPHY_MS = 1700;

type Choreography = "sunset" | "sunrise" | null;

/**
 * The landscape in the hero, fed by the page's clock and theme. `?sky=` sets
 * the scene when SCENE_OVERRIDE allows it, and then the scene holds still:
 * the override is a fixed moment for previews and tests.
 */
export function HeroLandscape({ skyParam }: { skyParam: string | undefined }) {
  const { now: firstNow, sceneOverride } = rootRoute.useLoaderData();
  const now = useNow();
  const { theme, change } = useTheme();

  const override = skyFromOverride({ param: skyParam, enabled: sceneOverride, now: firstNow });
  const sky = override ?? defaultSky(now);
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
