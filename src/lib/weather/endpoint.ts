/*
 * GET /api/weather: Glasgow's current weather from Open-Meteo, through our
 * Worker, so the visitor's IP never reaches Open-Meteo. Answers are cached on
 * our side, 30 minutes for weather and 5 for a failure, so the site calls
 * Open-Meteo at most about 48 times a day per data centre whatever the
 * traffic, and doesn't hammer it while it refuses.
 */
import { mapOpenMeteo, OPEN_METEO_URL, openMeteoSchema } from "./open-meteo";
import { type WeatherBody, weatherBodySchema } from "./weather";

const TIMEOUT_MS = 3000;
const WEATHER_SECONDS = 30 * 60;
const FAILURE_SECONDS = 5 * 60;
// The browser may keep any answer this long.
const BROWSER_SECONDS = 5 * 60;

/** The Workers Cache API's `match` and `put`, the two calls this needs. */
type WeatherCache = Pick<Cache, "match" | "put">;

type Deps = {
  fetch: typeof fetch;
  /** Null where there is no Workers Cache API, such as unit tests. */
  cache: WeatherCache | null;
  warn: (message: string) => void;
};

function workersCache(): WeatherCache | null {
  const storage: unknown = globalThis.caches;
  if (typeof storage === "object" && storage !== null && "default" in storage) {
    // `caches.default` is the Workers runtime's own cache; browsers don't have it.
    return storage.default as WeatherCache;
  }
  return null;
}

const defaultDeps = (): Deps => ({
  fetch: (input, init) => fetch(input, init),
  cache: workersCache(),
  warn: (message) => console.warn(message),
});

/** Why Open-Meteo gave no weather, for the log. Never anything about the visitor. */
type Failure =
  | { kind: "timeout" }
  | { kind: "network" }
  | { kind: "status"; status: number; reason: string | undefined }
  | { kind: "bad body" };

function describeFailure(failure: Failure): string {
  switch (failure.kind) {
    case "timeout":
    case "network":
    case "bad body":
      return failure.kind;
    case "status":
      return `status ${failure.status}${failure.reason ? `: ${failure.reason}` : ""}`;
    default: {
      const unhandled: never = failure;
      throw new Error(String(unhandled));
    }
  }
}

/** Open-Meteo's error body, `{ "error": true, "reason": "…" }`, when it sends one. */
async function errorReason(response: Response): Promise<string | undefined> {
  const body: unknown = await response.json().catch(() => undefined);
  if (typeof body === "object" && body !== null && "reason" in body) {
    return typeof body.reason === "string" ? body.reason : undefined;
  }
  return undefined;
}

async function fromOpenMeteo(deps: Deps): Promise<WeatherBody | Failure> {
  let response: Response;
  try {
    response = await deps.fetch(OPEN_METEO_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return { kind: timedOut ? "timeout" : "network" };
  }
  if (!response.ok)
    return { kind: "status", status: response.status, reason: await errorReason(response) };
  const parsed = openMeteoSchema.safeParse(await response.json().catch(() => undefined));
  if (!parsed.success) return { kind: "bad body" };
  return { weather: mapOpenMeteo(parsed.data.current) };
}

function answer(body: WeatherBody): Response {
  return Response.json(body, {
    headers: { "Cache-Control": `public, max-age=${BROWSER_SECONDS}` },
  });
}

/** Answers a GET to /api/weather, always with a 200 and a WeatherBody. */
export async function handleWeather(overrides: Partial<Deps> = {}): Promise<Response> {
  const deps: Deps = { ...defaultDeps(), ...overrides };

  const cached = await deps.cache?.match(OPEN_METEO_URL);
  if (cached) {
    const body = weatherBodySchema.safeParse(await cached.json().catch(() => undefined));
    if (body.success) return answer(body.data);
  }

  const result = await fromOpenMeteo(deps);
  const body: WeatherBody = "weather" in result ? result : { weather: null };
  if (!("weather" in result))
    deps.warn(`weather: no weather from Open-Meteo (${describeFailure(result)})`);

  const seconds = body.weather ? WEATHER_SECONDS : FAILURE_SECONDS;
  await deps.cache?.put(
    OPEN_METEO_URL,
    Response.json(body, { headers: { "Cache-Control": `s-maxage=${seconds}` } }),
  );
  return answer(body);
}
