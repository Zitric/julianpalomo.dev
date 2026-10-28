import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { parseThemeCookie, THEME_COOKIE } from "./theme";

/**
 * What the first render depends on, read on the server: the visitor's stored
 * theme and the request's time. The client's clock starts from this `now`, so
 * its first render matches the server's HTML.
 */
export const getFirstRender = createServerFn({ method: "GET" }).handler(() => ({
  choice: parseThemeCookie(getCookie(THEME_COOKIE)),
  now: Date.now(),
}));
