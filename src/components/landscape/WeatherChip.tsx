import { glasgow } from "../../lib/glasgow";
import type { Locale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { type ChipWord, chipWord, type LiveWeather } from "../../lib/weather/weather";
import { useNow } from "../clock/Clock";
import { useLocale } from "../i18n/useLocale";

const pill =
  "inline-flex h-11 items-center rounded-full bg-glass px-4 text-[13px] font-semibold text-foreground backdrop-blur-[6px]";

/**
 * Glasgow's time and weather on the landscape: "Glasgow · 15:04 · 9°C ·
 * Drizzle" from 640px, "9°C · Drizzle" below. Without weather, only the time.
 */
export function WeatherChip({ weather }: { weather: LiveWeather | null }) {
  const locale = useLocale();
  const now = useNow();

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: glasgow.timeZone,
  }).format(now);
  const where = `${t(locale, "glasgow")} · ${time}`;

  if (!weather) {
    return (
      <p className={pill}>
        <span className="hidden sm:inline">{where}</span>
        <span className="sm:hidden">{time}</span>
      </p>
    );
  }

  const temperature = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "celsius",
    maximumFractionDigits: 0,
  }).format(weather.temperatureC);
  const label = wordLabel(locale, chipWord(weather));

  return (
    <p className={pill}>
      {/* One flex item, so the text inside flows inline and keeps its spaces:
          between flex items, white space is dropped. */}
      <span>
        <span className="hidden sm:inline">{where} · </span>
        {temperature} · {label}
      </span>
    </p>
  );
}

function wordLabel(locale: Locale, word: ChipWord): string {
  switch (word.kind) {
    case "snow":
      return t(locale, "weatherSnow");
    case "haar":
      return t(locale, "weatherHaar");
    case "rain":
      return t(locale, "weatherRain")[word.level] ?? "";
    case "clouds":
      return t(locale, "weatherClouds")[word.level] ?? "";
    default: {
      const unhandled: never = word;
      throw new Error(String(unhandled));
    }
  }
}
