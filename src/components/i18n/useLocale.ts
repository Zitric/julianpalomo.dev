import { useLocation } from "@tanstack/react-router";
import { type Locale, localeFromPath } from "../../lib/i18n/locale";

/**
 * The page's language, from its URL: `/` is English and `/es` is Spanish.
 * Read from the path, not the route's parameter, so it also works in the root
 * shell, which renders <html lang> above the route that owns the parameter.
 */
export function useLocale(): Locale {
  return useLocation({ select: (location) => localeFromPath(location.pathname) });
}
