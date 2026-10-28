import { en, type Messages } from "./en";
import { es } from "./es";
import type { Locale } from "./locale";

const messages: Record<Locale, Messages> = { en, es };

/** The text for `key` in `locale`. */
export function t<K extends keyof Messages>(locale: Locale, key: K): Messages[K] {
  return messages[locale][key];
}
