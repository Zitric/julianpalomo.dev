import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { parseThemeCookie, THEME_COOKIE } from "./theme";

// Set for previews and e2e only (wrangler.jsonc), never in production.
const sceneEnvSchema = z.object({ SCENE_OVERRIDE: z.string().optional().catch(undefined) });

/**
 * What the first render depends on, read on the server: the visitor's stored
 * theme, the request's time, and whether `?sky=` may set the landscape. The
 * client's clock starts from this `now`, so its first render matches the
 * server's HTML.
 */
export const getFirstRender = createServerFn({ method: "GET" }).handler(async () => {
  // Imported here so the Workers runtime module stays out of the browser bundle.
  const { env } = await import("cloudflare:workers");
  return {
    choice: parseThemeCookie(getCookie(THEME_COOKIE)),
    now: Date.now(),
    sceneOverride: sceneEnvSchema.parse(env).SCENE_OVERRIDE === "1",
  };
});
