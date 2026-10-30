import { createServerFn } from "@tanstack/react-start";
import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";
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
 * here on every visit, so the first HTML already knows the entrance. A theme
 * cookie that no longer holds a choice (over, or the old one-year format) is
 * deleted in the same response.
 */
export const getFirstRender = createServerFn({ method: "GET" }).handler(async () => {
  // Imported here so the Workers runtime module stays out of the browser bundle.
  const { env } = await import("cloudflare:workers");
  const now = Date.now();
  const secure = getRequestProtocol() === "https";
  const entrance = entranceKind(getCookie(ENTRANCE_COOKIE));
  const cookie = entranceCookie({ secure });
  setCookie(cookie.name, cookie.value, cookie.options);
  const stored = getCookie(THEME_COOKIE);
  const choice = parseThemeCookie(stored, now);
  // The same attributes rememberChoice sets (src/lib/cookie.ts), or the
  // browser keeps the old cookie.
  if (stored !== undefined && choice === null) {
    deleteCookie(THEME_COOKIE, { path: "/", sameSite: "lax", secure });
  }
  return {
    choice,
    now,
    sceneOverride: sceneEnvSchema.parse(env).SCENE_OVERRIDE === "1",
    entrance,
  };
});
