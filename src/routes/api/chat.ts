import { createFileRoute } from "@tanstack/react-router";
import { handleChat } from "../../lib/bot/chat";

// The handlers run on the server, the one place the API key is read. Without
// ANY, other methods would get the app's HTML shell with a 200.
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: ({ request }) => handleChat(request, process.env),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "POST" } }),
    },
  },
});
