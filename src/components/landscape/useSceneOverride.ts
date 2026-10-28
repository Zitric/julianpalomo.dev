import { getRouteApi } from "@tanstack/react-router";
import { type SkyState, skyFromOverride } from "../../lib/scene/sky-state";

const rootRoute = getRouteApi("__root__");

/**
 * The sky `?sky=` asks for, when SCENE_OVERRIDE allows it, or null. Read from
 * the server's first-render time, so it holds still: an override is a fixed
 * scene for previews and tests.
 */
export function useSceneOverride(param: string | undefined): SkyState | null {
  const { now, sceneOverride } = rootRoute.useLoaderData();
  return skyFromOverride({ param, enabled: sceneOverride, now });
}
