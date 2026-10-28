import { z } from "zod";

const localeSchema = z.enum(["en", "es"]);
export type Locale = z.infer<typeof localeSchema>;

/** `/` is English and `/es` is Spanish: the route's optional `locale` parameter. */
export function localeFromParam(param: string | undefined): Locale {
  return param === "es" ? "es" : "en";
}

/** The language of a path: Spanish under `/es`, English everywhere else. */
export function localeFromPath(pathname: string): Locale {
  return localeFromParam(pathname.split("/")[1]);
}

/** The route parameter for a locale: none for English, so its page stays at `/`. */
export function paramFromLocale(locale: Locale): "es" | undefined {
  return locale === "es" ? "es" : undefined;
}

export const LANG_COOKIE = "lang";

/** The `lang` cookie's value, or null when it's missing or isn't a locale. */
export function parseLangCookie(value: unknown): Locale | null {
  const parsed = localeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Countries, as Cloudflare's two-letter codes, whose visitors get Spanish at `/` by default. */
const SPANISH_COUNTRIES: readonly string[] = ["ES"];

/**
 * The language for a request to `/`: the visitor's stored choice if there is
 * one, otherwise Spanish for a country in SPANISH_COUNTRIES and English for
 * any other country or none.
 */
export function chooseLanguage({
  cookie,
  country,
}: {
  cookie: Locale | null;
  country: string | null;
}): Locale {
  if (cookie) return cookie;
  return country !== null && SPANISH_COUNTRIES.includes(country) ? "es" : "en";
}
