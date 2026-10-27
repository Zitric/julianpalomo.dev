# How a question is answered

This is the whole path of one question, from the chat on the home page to the
streamed answer with its sources. Every step links to the file that does it.

```mermaid
flowchart TD
  visitor([Visitor types a question]) --> chat[Chat on the home page<br/>useChat]
  chat -->|POST /api/chat| route[Server route]
  route --> key{API key?}
  key -->|no, BOT_DEMO=1| validateDemo{Valid request?}
  key -->|no, no demo| r503[503 unavailable]
  key -->|yes, but no D1 or salt| r503
  key -->|yes| validate{Valid request?}
  validate -->|no| r400[400 invalid_request]
  validateDemo -->|no| r400
  validateDemo -->|yes| demo[Demo model<br/>scripted, no cost]
  validate -->|yes| limits{Today's limits<br/>in D1}
  limits -->|over| r429[429 visitor_limit<br/>or daily_budget]
  limits -->|under| count[Count the question]
  count --> model[Claude Haiku 5.5]
  model <-->|read-only tools| tools[list_topics, get_claims,<br/>search_claims]
  demo <-->|get_claims| tools
  tools --> claims[(Confirmed claims)]
  tools -->|claims returned| sources[data-sources part]
  model --> stream[Streamed answer<br/>with citation markers]
  demo --> stream
  stream --> check[Citation check<br/>logs invalid ids]
  model -->|token usage| spend[Add today's spend in D1]
  stream --> render[Answer with numbered<br/>citations and source chips]
  sources --> render
```

The checks run in this order, so a request that fails validation never counts
against a visitor's limit.

## The steps

**The chat.** [`src/components/chat/Chat.tsx`](../src/components/chat/Chat.tsx)
uses the AI SDK's `useChat`, which posts the conversation to `/api/chat` and
reads the streamed answer. A counter in
[`Composer.tsx`](../src/components/chat/Composer.tsx) keeps a question under
1,000 characters, so the visitor never hits the endpoint's own limit.

**The route.** [`src/routes/api/chat.ts`](../src/routes/api/chat.ts) accepts
only `POST` and passes the request and the Worker's environment (vars, secrets
and the D1 binding) to `handleChat` in
[`src/lib/bot/chat.ts`](../src/lib/bot/chat.ts), where every other step
starts.

**Key or demo.** With an Anthropic API key, the real model answers. Without
one, `BOT_DEMO=1` turns on demo mode, used by previews and the e2e tests; with
neither, the endpoint answers `503`. A key without the D1 binding or the
visitor salt also answers `503`, so a real model call never happens without the
limits in front of it.

**Validation.** The request body is parsed with Zod: at most 20 messages, at
most 1,000 characters per visitor message, and the conversation must end with
the visitor's question. Only the text of earlier messages reaches the model,
so a visitor can't forge a tool result in the history.

**The limits.** [`src/lib/bot/usage.ts`](../src/lib/bot/usage.ts) reads
today's counts from D1 (the tables are in
[`migrations/`](../migrations/0001_daily_limits.sql)) and
[`src/lib/bot/limits.ts`](../src/lib/bot/limits.ts) decides: 30 questions per
visitor a day, and $1.00 of estimated spend a day across everyone. A visitor is
a SHA-256 hash of their IP, the UTC date and a secret salt, so no IP is stored
and nobody can be followed from one day to the next. For an IPv6 address the
hash takes its /64 instead, since one person can rotate through all of it. Over a limit, the endpoint
answers `429` without calling the model.

**The model and its tools.** Claude Haiku 5.5, set in
[`src/lib/bot/model.ts`](../src/lib/bot/model.ts), answers with the system
prompt in [`src/lib/bot/prompt.ts`](../src/lib/bot/prompt.ts). It can only
look things up through three read-only tools in
[`src/lib/bot/tools.ts`](../src/lib/bot/tools.ts), built from the claims Julian
has confirmed ([`src/lib/claims.ts`](../src/lib/claims.ts)). Demo mode,
[`src/lib/bot/demo.ts`](../src/lib/bot/demo.ts), is a scripted model that calls
the same `get_claims` tool and quotes the first claim it returns.

**Sources and citations.** Every claim a tool returns while answering is sent
to the browser as one `data-sources` part. The answer cites claims as
`[[claim-id]]`; when it ends, the server parses the text with
[`src/lib/bot/citations.ts`](../src/lib/bot/citations.ts) and logs the ids of
any citation that no tool returned. Then the token usage of every step that
finished is added to today's estimated spend, once per answer, however it
ended: finished, failed, or stopped by the visitor. When the visitor presses
Stop or leaves, the request's abort signal cancels the model call, and the
write to D1 goes through `waitUntil` so it still lands after they've gone. A
step cut off halfway isn't counted ([`docs/tech-debt.md`](tech-debt.md)).

**The answer on the page.** [`AssistantMessage.tsx`](../src/components/chat/AssistantMessage.tsx)
renders the text with the same parser. A citation becomes a numbered marker and
a source chip, such as "CV · Cazoo · Redux → Zustand", only when its id is both
cited in the text and in `data-sources`.

The reasons behind these choices are in [`docs/adr/`](adr/README.md).
