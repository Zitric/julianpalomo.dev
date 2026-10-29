import { describe, expect, it, vi } from "vitest";
import { handleWeather } from "../../src/lib/weather/endpoint";
import { mapOpenMeteo, OPEN_METEO_URL, openMeteoSchema } from "../../src/lib/weather/open-meteo";
import { chipWord, type LiveWeather, weatherBodySchema } from "../../src/lib/weather/weather";
import { openMeteoResponse } from "./fixtures/open-meteo";

const calm = {
  interval: 900,
  temperature_2m: 9.4,
  precipitation: 0,
  snowfall: 0,
  weather_code: 0,
  cloud_cover: 0,
  wind_speed_10m: 0,
};

describe("openMeteoSchema", () => {
  it("reads a real Open-Meteo response", () => {
    const parsed = openMeteoSchema.parse(openMeteoResponse);
    expect(mapOpenMeteo(parsed.current)).toEqual({
      clouds: 10,
      rain: 0,
      wind: 2,
      snow: false,
      haar: false,
      temperatureC: 11,
    });
  });

  it("asks Open-Meteo for Glasgow, with the wind in knots", () => {
    const url = new URL(OPEN_METEO_URL);
    expect(url.searchParams.get("latitude")).toBe("55.8642");
    expect(url.searchParams.get("longitude")).toBe("-4.2518");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kn");
    expect(url.searchParams.get("current")?.split(",").sort()).toEqual(
      [
        "cloud_cover",
        "precipitation",
        "snowfall",
        "temperature_2m",
        "weather_code",
        "wind_speed_10m",
      ].sort(),
    );
  });
});

describe("mapOpenMeteo", () => {
  it("is a clear, calm, dry sky with nothing in it", () => {
    expect(mapOpenMeteo(calm)).toEqual({
      clouds: 0,
      rain: 0,
      wind: 0,
      snow: false,
      haar: false,
      temperatureC: 9,
    });
  });

  it.each([
    [0, 0],
    [4, 0],
    [5, 1],
    [44, 4],
    [100, 10],
  ])("turns %s%% cloud cover into level %s", (cover, level) => {
    expect(mapOpenMeteo({ ...calm, cloud_cover: cover }).clouds).toBe(level);
  });

  // mm per hour; the quarter-hour sum is a quarter of it.
  it.each([
    [0, 0],
    [0.2, 1],
    [0.21, 2],
    [0.5, 2],
    [1, 3],
    [2, 4],
    [3, 5],
    [4, 6],
    [6, 7],
    [8, 8],
    [12, 9],
    [12.1, 10],
  ])("turns %s mm an hour into rain level %s", (perHour, level) => {
    expect(mapOpenMeteo({ ...calm, precipitation: perHour / 4 }).rain).toBe(level);
  });

  it("reads the response's interval rather than assuming a quarter of an hour", () => {
    expect(mapOpenMeteo({ ...calm, interval: 3600, precipitation: 2 }).rain).toBe(4);
  });

  it("gives drizzle at least level 1 and a thunderstorm at least 7", () => {
    expect(mapOpenMeteo({ ...calm, weather_code: 51 }).rain).toBe(1);
    expect(mapOpenMeteo({ ...calm, weather_code: 57 }).rain).toBe(1);
    expect(mapOpenMeteo({ ...calm, weather_code: 95 }).rain).toBe(7);
    // 3.1 mm in a quarter of an hour is 12.4 mm an hour: above the floor of 7.
    expect(mapOpenMeteo({ ...calm, weather_code: 99, precipitation: 3.1 }).rain).toBe(10);
  });

  it("treats rain, freezing rain and showers by their amount", () => {
    for (const code of [61, 63, 65, 66, 67, 80, 81, 82]) {
      expect(mapOpenMeteo({ ...calm, weather_code: code, precipitation: 0.5 }).rain).toBe(4);
    }
  });

  it("snows on a snow code or any snowfall, with at least a few flakes", () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(mapOpenMeteo({ ...calm, weather_code: code })).toMatchObject({ snow: true, rain: 1 });
    }
    expect(mapOpenMeteo({ ...calm, snowfall: 0.1 })).toMatchObject({ snow: true, rain: 1 });
    // 0.75 mm in a quarter of an hour is 3 mm an hour.
    expect(mapOpenMeteo({ ...calm, weather_code: 75, precipitation: 0.75 }).rain).toBe(5);
  });

  it("brings in the haar on a fog code", () => {
    expect(mapOpenMeteo({ ...calm, weather_code: 45 }).haar).toBe(true);
    expect(mapOpenMeteo({ ...calm, weather_code: 48 }).haar).toBe(true);
    expect(mapOpenMeteo({ ...calm, weather_code: 3 }).haar).toBe(false);
  });

  // Knots, at each force's lower edge on the Met Office's table.
  it.each([
    [0.4, 0],
    [1, 1],
    [3, 1],
    [4, 2],
    [10, 3],
    [11, 4],
    [17, 5],
    [22, 6],
    [28, 7],
    [34, 8],
    [41, 9],
    [48, 10],
    [70, 10],
  ])("turns %s knots into Beaufort %s, capped at 10", (knots, force) => {
    expect(mapOpenMeteo({ ...calm, wind_speed_10m: knots }).wind).toBe(force);
  });

  it("rounds the temperature to a whole degree", () => {
    expect(mapOpenMeteo({ ...calm, temperature_2m: -0.6 }).temperatureC).toBe(-1);
  });
});

describe("chipWord", () => {
  const sky: LiveWeather = {
    clouds: 4,
    rain: 0,
    wind: 6,
    snow: false,
    haar: false,
    temperatureC: 9,
  };

  it("names snow over rain over haar over clouds, and never the wind", () => {
    expect(chipWord({ ...sky, rain: 3, snow: true, haar: true })).toEqual({ kind: "snow" });
    expect(chipWord({ ...sky, rain: 3, haar: true })).toEqual({ kind: "rain", level: 3 });
    expect(chipWord({ ...sky, haar: true })).toEqual({ kind: "haar" });
    expect(chipWord(sky)).toEqual({ kind: "clouds", level: 4 });
  });
});

/** A Workers-like cache in memory: what `put` stores, `match` returns. */
function memoryCache() {
  const store = new Map<string, Response>();
  const puts: { key: string; cacheControl: string | null }[] = [];
  return {
    puts,
    match: vi.fn(async (key: RequestInfo | URL) => store.get(String(key))?.clone()),
    put: vi.fn(async (key: RequestInfo | URL, response: Response) => {
      puts.push({ key: String(key), cacheControl: response.headers.get("Cache-Control") });
      store.set(String(key), response);
    }),
  };
}

async function body(response: Response) {
  return weatherBodySchema.parse(await response.json());
}

describe("handleWeather", () => {
  it("answers Open-Meteo's weather and keeps it for 30 minutes", async () => {
    const cache = memoryCache();
    const fetch = vi.fn(async () => Response.json(openMeteoResponse));
    const response = await handleWeather({ fetch, cache, warn: vi.fn() });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
    expect((await body(response)).weather).toMatchObject({ clouds: 10, temperatureC: 11 });
    expect(fetch).toHaveBeenCalledWith(OPEN_METEO_URL, expect.anything());
    expect(cache.puts).toEqual([{ key: OPEN_METEO_URL, cacheControl: "s-maxage=1800" }]);
  });

  it("answers from the cache without calling Open-Meteo", async () => {
    const cache = memoryCache();
    await handleWeather({
      fetch: async () => Response.json(openMeteoResponse),
      cache,
      warn: vi.fn(),
    });
    const fetch = vi.fn(async () => Response.json(openMeteoResponse));

    const response = await handleWeather({ fetch, cache, warn: vi.fn() });
    expect(fetch).not.toHaveBeenCalled();
    expect((await body(response)).weather).toMatchObject({ clouds: 10 });
  });

  it.each([
    [
      "a time-out",
      async () => Promise.reject(new DOMException("timed out", "TimeoutError")),
      "timeout",
    ],
    ["a network error", async () => Promise.reject(new TypeError("fetch failed")), "network"],
    ["a bad body", async () => Response.json({ current: { cloud_cover: "lots" } }), "bad body"],
    ["a 500", async () => new Response("oops", { status: 500 }), "status 500"],
  ])(
    "answers no weather on %s, logs why and keeps that for 5 minutes",
    async (_name, fake, why) => {
      const cache = memoryCache();
      const warn = vi.fn();
      const response = await handleWeather({ fetch: fake, cache, warn });

      expect(response.status).toBe(200);
      expect(await body(response)).toEqual({ weather: null });
      expect(warn).toHaveBeenCalledWith(`weather: no weather from Open-Meteo (${why})`);
      expect(cache.puts).toEqual([{ key: OPEN_METEO_URL, cacheControl: "s-maxage=300" }]);
    },
  );

  it("logs Open-Meteo's own reason when it refuses", async () => {
    const reason = "Daily API request limit exceeded. Please try again tomorrow.";
    const cache = memoryCache();
    const warn = vi.fn();
    const response = await handleWeather({
      fetch: async () => Response.json({ error: true, reason }, { status: 429 }),
      cache,
      warn,
    });

    expect(await body(response)).toEqual({ weather: null });
    expect(warn).toHaveBeenCalledWith(
      `weather: no weather from Open-Meteo (status 429: ${reason})`,
    );
    expect(cache.puts[0]?.cacheControl).toBe("s-maxage=300");
  });

  it("works without a cache, as in unit tests and local tools", async () => {
    const response = await handleWeather({
      fetch: async () => Response.json(openMeteoResponse),
      cache: null,
      warn: vi.fn(),
    });
    expect((await body(response)).weather).not.toBeNull();
  });
});
