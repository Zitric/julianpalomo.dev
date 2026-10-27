---
paths:
  - "src/lib/bot/**"
  - "src/routes/api/**"
  - "tests/unit/bot-tools.test.ts"
  - "tests/unit/chat-endpoint.test.ts"
  - "tests/e2e/bundle.spec.ts"
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

## Where things live

- `model.ts` holds the model id and its settings. Never add temperature, `topP` or `topK`: this model rejects non-default values.
- `prompt.ts` holds the system prompt, the only copy. Keep it byte-stable (no dates, ids or anything per request), or prompt caching stops working.
- `tools.ts` builds the tools from an array of claims, so tests can pass fixtures.
- `chat.ts` validates the request with Zod, checks the key and streams the answer. `src/routes/api/chat.ts` only passes in the request and `process.env`.

## The key and the endpoint

- **The API key is read only on the server**, in `chat.ts` through the route. Without it the endpoint answers `503 { "error": "unavailable" }` and never creates a model; that's how previews and production run until the secret exists.
- `/api/chat` is the one internal route the browser calls with `fetch`, through `useChat`; everything else goes through `createServerFn` (`react-and-typescript.md`).
- Errors reach the client as `{ "error": ... }` or a fixed stream message, never a stack trace or the provider's message. The real error goes to `console.error`, which Workers observability keeps.
- `tests/e2e/bundle.spec.ts` fails if the browser bundle contains `ANTHROPIC_API_KEY` or `confirmedByJulian`.

## Tests

- Unit tests never call the real model. They use `MockLanguageModelV4` from `ai/test`, passed in through `handleChat`'s `createModel`.

## The AI SDK

It is at v7. Check its docs (shipped in `node_modules/ai/docs/` and `node_modules/@ai-sdk/anthropic/docs/`) for every API; v5 and v6 examples look similar and use different names.

If `chat.ts` or `tools.ts` change shape, update this rule.
