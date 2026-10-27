import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { handleChat } from "../../lib/bot/chat";

// The handlers run on the server, the one place the API key is read. `env`
// holds the Worker's vars, secrets and the D1 binding; process.env would have
// the text values but not the binding. Without ANY, other methods would get
// the app's HTML shell with a 200.
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: ({ request }) => handleChat(request, env),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "POST" } }),
    },
  },
});
