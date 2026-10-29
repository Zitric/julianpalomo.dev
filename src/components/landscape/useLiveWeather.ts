import { useEffect, useState } from "react";
import { type LiveWeather, weatherBodySchema } from "../../lib/weather/weather";

/**
 * Glasgow's weather from /api/weather, fetched once after hydration, so the
 * page renders with a clear sky and the weather rolls in. Null until it
 * arrives, when it can't be had, or while `enabled` is false.
 */
export function useLiveWeather(enabled: boolean): LiveWeather | null {
  const [weather, setWeather] = useState<LiveWeather | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/api/weather", { signal: controller.signal })
      .then((response) => response.json())
      .then((json: unknown) => {
        const body = weatherBodySchema.safeParse(json);
        if (body.success) setWeather(body.data.weather);
      })
      // A failed, malformed or aborted fetch leaves the sky as it is.
      .catch(() => undefined);
    return () => controller.abort();
  }, [enabled]);

  return weather;
}
