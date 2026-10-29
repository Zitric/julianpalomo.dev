/*
 * Open-Meteo's current conditions for Glasgow, and their mapping to the
 * landscape's levels (DESIGN.md section 7, "Live Glasgow weather"). Variable
 * names, units and weather codes follow Open-Meteo's docs
 * (https://open-meteo.com/en/docs).
 */
import { z } from "zod";
import { glasgow } from "../glasgow";
import type { LiveWeather } from "./weather";

const params = new URLSearchParams({
  latitude: String(glasgow.latitude),
  longitude: String(glasgow.longitude),
  current: "temperature_2m,precipitation,snowfall,weather_code,cloud_cover,wind_speed_10m",
  // Knots, so the wind maps straight onto the Met Office's Beaufort table.
  wind_speed_unit: "kn",
  timezone: glasgow.timeZone,
});
export const OPEN_METEO_URL = `https://api.open-meteo.com/v1/forecast?${params}`;

/** The fields we read; anything else in the response is ignored. */
export const openMeteoSchema = z.object({
  current: z.object({
    /** Seconds the sums (precipitation, snowfall) cover, counted back from `time`. */
    interval: z.number().positive(),
    temperature_2m: z.number(),
    /** mm over `interval`. */
    precipitation: z.number().min(0),
    /** cm over `interval`. */
    snowfall: z.number().min(0),
    weather_code: z.number().int(),
    /** % of the sky. */
    cloud_cover: z.number().min(0).max(100),
    /** Knots, at 10m. */
    wind_speed_10m: z.number().min(0),
  }),
});
type Current = z.infer<typeof openMeteoSchema>["current"];

// WMO weather codes, from Open-Meteo's table.
const FOG = [45, 48];
const DRIZZLE = [51, 53, 55, 56, 57];
const SNOW = [71, 73, 75, 77, 85, 86];
const isThunderstorm = (code: number) => code >= 95 && code <= 99;

// mm per hour at or below which each rain level applies (DESIGN.md section 7).
const RAIN_STEPS = [0, 0.2, 0.5, 1, 2, 3, 4, 6, 8, 12];

// The lowest wind speed, in knots, of Beaufort forces 1 to 10, from the Met
// Office's table (https://weather.metoffice.gov.uk/guides/coast-and-sea/beaufort-scale).
const BEAUFORT_KNOTS = [1, 4, 7, 11, 17, 22, 28, 34, 41, 48];

function rainLevel(mmPerHour: number): number {
  const index = RAIN_STEPS.findIndex((top) => mmPerHour <= top);
  return index === -1 ? 10 : index;
}

function beaufort(knots: number): number {
  const rounded = Math.round(knots);
  return BEAUFORT_KNOTS.filter((low) => rounded >= low).length;
}

/** Open-Meteo's current values to the landscape's weather levels. */
export function mapOpenMeteo(current: Current): LiveWeather {
  const code = current.weather_code;
  const snow = SNOW.includes(code) || current.snowfall > 0;
  // `current` sums cover `interval` seconds (900, a quarter of an hour), and
  // the rain table is in mm per hour.
  let rain = rainLevel((current.precipitation * 3600) / current.interval);
  if (DRIZZLE.includes(code) || snow) rain = Math.max(rain, 1);
  if (isThunderstorm(code)) rain = Math.max(rain, 7);
  return {
    clouds: Math.round(current.cloud_cover / 10),
    rain,
    wind: beaufort(current.wind_speed_10m),
    snow,
    haar: FOG.includes(code),
    temperatureC: Math.round(current.temperature_2m),
  };
}
