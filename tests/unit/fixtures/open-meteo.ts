// A real response from api.open-meteo.com for Glasgow, saved as it came, for
// the request in src/lib/weather/open-meteo.ts (wind in knots).
export const openMeteoResponse: unknown = {
  latitude: 55.858753,
  longitude: -4.262726,
  generationtime_ms: 0.10442733764648438,
  utc_offset_seconds: 0,
  timezone: "Europe/London",
  timezone_abbreviation: "GMT",
  elevation: 34.0,
  current_units: {
    time: "iso8601",
    interval: "seconds",
    temperature_2m: "°C",
    precipitation: "mm",
    snowfall: "cm",
    weather_code: "wmo code",
    cloud_cover: "%",
    wind_speed_10m: "kn",
  },
  current: {
    time: "2026-10-28T23:15",
    interval: 900,
    temperature_2m: 11.3,
    precipitation: 0.0,
    snowfall: 0.0,
    weather_code: 3,
    cloud_cover: 100,
    wind_speed_10m: 4.1,
  },
};
