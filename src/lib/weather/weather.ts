/**
 * Glasgow's live weather as the page receives it from /api/weather. Safe to
 * import in the browser: the endpoint builds this body and the page parses it
 * with the same schema.
 */
import { z } from "zod";

const level = z.number().int().min(0).max(10);

const liveWeatherSchema = z.object({
  clouds: level,
  rain: level,
  wind: level,
  snow: z.boolean(),
  haar: z.boolean(),
  temperatureC: z.number().int(),
});
export type LiveWeather = z.infer<typeof liveWeatherSchema>;

/** The body of every /api/weather answer: the weather, or null when there is none to give. */
export const weatherBodySchema = z.object({ weather: liveWeatherSchema.nullable() });
export type WeatherBody = z.infer<typeof weatherBodySchema>;

/** The one word the weather chip shows: snow over rain over haar over clouds. Wind isn't shown. */
export type ChipWord =
  | { kind: "snow" }
  | { kind: "rain"; level: number }
  | { kind: "haar" }
  | { kind: "clouds"; level: number };

export function chipWord(weather: LiveWeather): ChipWord {
  if (weather.snow && weather.rain > 0) return { kind: "snow" };
  if (weather.rain > 0) return { kind: "rain", level: weather.rain };
  if (weather.haar) return { kind: "haar" };
  return { kind: "clouds", level: weather.clouds };
}
