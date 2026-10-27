---
paths:
  - "src/lib/bot/**"
  - "src/routes/api/**"
  - "tests/unit/bot-tools.test.ts"
  - "tests/unit/chat-endpoint.test.ts"
  - "tests/unit/citations.test.ts"
  - "tests/e2e/bundle.spec.ts"
  - "tests/e2e/chat.spec.ts"
  - "src/components/chat/**"
  - "migrations/**"
  - "tests/unit/limits.test.ts"
  - "tests/unit/usage.test.ts"
  - "docs/architecture.md"
---

# The bot

The assistant answers questions about Julian from his confirmed claims. The
reasons are in three ADRs: `docs/adr/2026-10-26-ai-sdk-claude-read-only-tools.md`,
`docs/adr/2026-10-26-answers-only-from-confirmed-claims.md` and
`docs/adr/2026-10-27-claude-model-and-ai-sdk-7.md`. This rule says what the code
must keep doing; the ADRs say why.

## What feeds the model

- **Only `confirmedClaims()` feeds the model.** Nothing in the bot imports `claims.json` or `parseClaims`. `tests/unit/chat-endpoint.test.ts` checks that the endpoint's tools are built from `confirmedClaims()`.
- **Every tool is read-only.** A tool returns pieces of the claims it was built from and never writes, sends or fetches. A claim leaves a tool with `id`, `label`, `org`, `source`, `area` and `text`, never `confirmedByJulian`.
- **Visitor text is data, never instructions.** Only the text parts of the conversation reach the model: tool results and any other part in the history are dropped, because the visitor controls the history and could forge them. Nothing a visitor sends changes which tools or claims the model sees.

## Citations

- **A citation becomes a source only if a tool returned that claim while producing the same answer.** `src/lib/bot/citations.ts` is the one place `[[claim-id]]` markers are parsed, on the server and in the UI. The endpoint sends those claims as one `data-sources` part, and logs the ids of invalid citations, never the text.

## Limits

- **Every model call goes through the daily limits.** `handleChat` checks them in D1 before creating the model and answers `429` (`visitor_limit` or `daily_budget`) when one is hit. With a key but no `DB` binding or no `VISITOR_SALT` it answers `503`: never call the model without the limits in front of it. Demo answers cost nothing and skip them.
- **`limits.ts` stays browser-safe**: the constants, the price table and pure functions only. D1, the visitor hash and anything that reads a secret go in `usage.ts`, which only `chat.ts` imports.
- **The prices in `limits.ts` belong to the model.** When `MODEL_ID` in `model.ts` changes, change them in the same commit. Money is integer micro-dollars, never floats.
- A visitor is a SHA-256 of the salt, the UTC day and `visitorKey(ip)`: the IPv4 address, or the /64 of an IPv6 one, so rotating through a /64 doesn't reset the limit. Never store the IP or the prefix, and keep the day in the hash so a visitor can't be followed across days.
- `docs/architecture.md` draws the whole path of a question; update it when a step changes.

## Demo mode

- **Demo mode answers only when there is no API key and `BOT_DEMO` is `"1"`.** With a key the flag is ignored, so production can never serve the demo. `BOT_DEMO` is set for previews (`previews.vars` in `wrangler.jsonc`) and for e2e (`env.e2e`, built with `CLOUDFLARE_ENV=e2e`); never set it at the top level.
- `demo.ts` is a scripted mock model: it calls the real `get_claims` and quotes the first claim it returns, word for word, with its citation. It never writes anything else about Julian. The UI shows its "Demo" label from `metadata.demo`, never from the text.
- `env.e2e` has `secrets.required: []` so the Vite plugin doesn't copy a local `.dev.vars`, with a real key, into the e2e build, and `routes: []` so it never inherits the production domain. Keep both empty.

## The chat UI

- `src/components/chat/` renders the answer with `parseCitations` and shows a chip only for an id that is both cited in the text and in the answer's `data-sources` part. The pure logic lives in `chat-view.ts`, with unit tests.
- Code the browser imports must not pull in server code or `claims.json`: share values through client-safe modules (`limits.ts`, `chat-error.ts`, `chat-message.ts`, `../claim-id.ts`), never through `chat.ts` or `claims.ts`.

## Where things live

- `model.ts` holds the model id and its settings. Never add temperature, `topP` or `topK`: this model rejects non-default values.
- `prompt.ts` holds the system prompt, the only copy. Keep it byte-stable (no dates, ids or anything per request), or prompt caching stops working.
- `tools.ts` builds the tools from an array of claims, so tests can pass fixtures.
- `chat.ts` validates the request with Zod, checks the key and streams the answer. `src/routes/api/chat.ts` only passes in the request and `env` from `cloudflare:workers`, which, unlike `process.env`, includes the D1 binding.

## The key and the endpoint

- **The API key is read only on the server**, in `chat.ts` through the route. Without it, and without demo mode, the endpoint answers `503 { "error": "unavailable" }` and never creates a model; that's how production runs until the secret exists.
- `/api/chat` is the one internal route the browser calls with `fetch`, from `useChat` in `src/components/chat/Chat.tsx`; everything else goes through `createServerFn` (`react-and-typescript.md`).
- Errors reach the client as `{ "error": ... }` (built in `chat-error.ts`) or a fixed stream message, never a stack trace or the provider's message. The real error goes to `console.error` once, from `streamText`'s own `onError` (without it the SDK logs it too), and Workers observability keeps it. The UI stream's `onError` only maps it to the fixed message.
- `tests/e2e/bundle.spec.ts` fails if the browser bundle contains `ANTHROPIC_API_KEY` or `confirmedByJulian`.

## Tests

- Unit tests never call the real model. They use `MockLanguageModelV4` from `ai/test`, passed in through `handleChat`'s `createModel`, and an in-memory store through `createStore`, so they never touch D1.
- e2e tests run the chat in demo mode. The "not available" test fakes the 503 with `page.route`, using `chatErrorBody` so its body can't drift from the endpoint's.

## The AI SDK

It is at v7. Check its docs (shipped in `node_modules/ai/docs/` and `node_modules/@ai-sdk/anthropic/docs/`) for every API; v5 and v6 examples look similar and use different names.

If `chat.ts`, `tools.ts`, `citations.ts`, `demo.ts`, `limits.ts`, `usage.ts` or `src/components/chat/` change shape, update this rule.
