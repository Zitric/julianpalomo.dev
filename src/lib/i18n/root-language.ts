import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { chooseLanguage, LANG_COOKIE, type Locale, parseLangCookie } from "./locale";

const cfSchema = z.object({ country: z.string() });

/**
 * The visitor's country, as Cloudflare saw the request: `request.cf.country`,
 * or the `CF-IPCountry` header. Read only here, on the server, and never
 * stored, logged or sent to the page.
 */
function requestCountry(): string | null {
  const request = getRequest();
  const cf = cfSchema.safeParse("cf" in request ? request.cf : undefined);
  if (cf.success) return cf.data.country;
  return request.headers.get("cf-ipcountry");
}

/**
 * The language a request to `/` gets. On the server, from the `lang` cookie,
 * then the country. On the client, null: there the only way to `/` is the
 * language toggle, which stores the choice before it navigates.
 */
export const rootLanguage = createIsomorphicFn()
  .server((): Locale | null =>
    chooseLanguage({ cookie: parseLangCookie(getCookie(LANG_COOKIE)), country: requestCountry() }),
  )
  .client((): Locale | null => null);
