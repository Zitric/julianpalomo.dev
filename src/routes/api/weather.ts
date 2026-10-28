import { createFileRoute } from "@tanstack/react-router";
import { handleWeather } from "../../lib/weather/endpoint";

// A public GET the browser may cache, so the page fetches it directly rather
// than through a server function (.claude/rules/react-and-typescript.md).
export const Route = createFileRoute("/api/weather")({
  server: {
    handlers: {
      GET: () => handleWeather(),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET" } }),
    },
  },
});
