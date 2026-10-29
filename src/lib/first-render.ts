import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequestProtocol, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { ENTRANCE_COOKIE, entranceCookie, entranceKind } from "./entrance";
import { parseThemeCookie, THEME_COOKIE } from "./theme";

// Set for previews and e2e only (wrangler.jsonc), never in production.
const sceneEnvSchema = z.object({ SCENE_OVERRIDE: z.string().optional().catch(undefined) });

/**
 * What the first render depends on, read on the server: the visitor's stored
 * theme, the request's time, whether `?sky=` may set the landscape, and which
 * entrance the page plays. The client's clock starts from this `now`, so its
 * first render matches the server's HTML. The entrance's cookie is refreshed
 * here on every visit, so the first HTML already knows the entrance.
 */
export const getFirstRender = createServerFn({ method: "GET" }).handler(async () => {
  // Imported here so the Workers runtime module stays out of the browser bundle.
  const { env } = await import("cloudflare:workers");
  const entrance = entranceKind(getCookie(ENTRANCE_COOKIE));
  const cookie = entranceCookie({ secure: getRequestProtocol() === "https" });
  setCookie(cookie.name, cookie.value, cookie.options);
  return {
    choice: parseThemeCookie(getCookie(THEME_COOKIE)),
    now: Date.now(),
    sceneOverride: sceneEnvSchema.parse(env).SCENE_OVERRIDE === "1",
    entrance,
  };
});
