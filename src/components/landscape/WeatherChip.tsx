import { glasgow } from "../../lib/glasgow";
import type { Locale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";
import { type ChipWord, chipWord, type LiveWeather } from "../../lib/weather/weather";
import { useNow } from "../clock/Clock";
import { useLocale } from "../i18n/useLocale";

const pill =
  "inline-flex h-11 items-center rounded-full px-4 text-[13px] font-semibold transition-transform duration-[80ms] motion-safe:active:scale-[0.97]";
const glass = "bg-glass text-foreground backdrop-blur-[6px]";
const accent = "bg-accent text-on-accent hover:brightness-110";

type Props = {
  weather: LiveWeather | null;
  /** The visitor's own sky's hour while they play with it, or null while live. */
  playingHour: number | null;
  /** Opens the gear's panel, from the chip as from the gear. */
  onOpen: (trigger: HTMLElement) => void;
  onBackToLive: () => void;
};

/**
 * Glasgow's time and weather on the landscape, as a button: "Glasgow · 15:04 ·
 * 9°C · Drizzle" from 640px, "9°C · Drizzle" below, or only the time without
 * weather; pressing it opens the gear's panel. While the visitor plays, it
 * turns accent and reads "Your sky · 15:00 · tap to reset", and pressing it
 * goes back to live.
 */
export function WeatherChip({ weather, playingHour, onOpen, onBackToLive }: Props) {
  const locale = useLocale();
  const now = useNow();

  if (playingHour !== null) {
    const hour = `${String(playingHour).padStart(2, "0")}:00`;
    return (
      <button
        type="button"
        className={`${pill} ${accent}`}
        aria-label={t(locale, "chipPlayingName")(hour)}
        onClick={onBackToLive}
      >
        {`${t(locale, "yourSky")} · ${hour} · ${t(locale, "tapToReset")}`}
      </button>
    );
  }

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: glasgow.timeZone,
  }).format(now);
  const where = `${t(locale, "glasgow")} · ${time}`;
  const open = (event: { currentTarget: HTMLElement }) => onOpen(event.currentTarget);

  if (!weather) {
    return (
      <button
        type="button"
        className={`${pill} ${glass}`}
        aria-label={t(locale, "chipLiveName")(time)}
        onClick={open}
      >
        <span className="hidden sm:inline">{where}</span>
        <span className="sm:hidden">{time}</span>
      </button>
    );
  }

  const temperature = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: "celsius",
    maximumFractionDigits: 0,
  }).format(weather.temperatureC);
  const label = wordLabel(locale, chipWord(weather));
  const name = t(locale, "chipLiveName")(`${temperature}, ${label.toLocaleLowerCase(locale)}`);

  return (
    <button type="button" className={`${pill} ${glass}`} aria-label={name} onClick={open}>
      {/* One flex item, so the text inside flows inline and keeps its spaces:
          between flex items, white space is dropped. */}
      <span>
        <span className="hidden sm:inline">{where} · </span>
        {temperature} · {label}
      </span>
    </button>
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
