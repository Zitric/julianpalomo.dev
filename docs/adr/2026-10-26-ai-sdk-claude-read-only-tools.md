# The Vercel AI SDK with Claude and read-only tools

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The assistant has to stream answers, call tools to look things up, and show
in the UI which tool it's using. Writing that plumbing by hand against a
provider's raw API is a lot of code to own.

Anyone on the internet can type into the chat, including people trying to make
it misbehave. Whatever the model is allowed to do, an attacker may be able to
make it do.

## Decision

- Use the **Vercel AI SDK** (v6): `streamText` with tools on the server, and
  the `useChat` hook in the browser. Despite the name, it isn't tied to Vercel
  hosting and runs on Cloudflare Workers.
- Use a **Claude** model through the SDK's Anthropic provider. Which model is
  decided when the bot is built, against current prices.
- **Every tool is read-only.** Tools return pieces of the approved data and
  nothing else. No tool writes, sends or calls anything outside the app.

## Alternatives considered

- **Anthropic's own SDK directly.** Fewer layers, but streaming to the UI and
  the client-side chat state would be ours to build and maintain.
- **Pasting the whole CV into the prompt.** Simpler, but the model can then
  blend facts freely, and there's no record of which fact an answer came from.

## Consequences

- A prompt injection can at worst make the assistant say something silly; it
  can't make it act.
- Tool calls give us a trail of which data each answer used, which the
  citation checks in the next decision depend on.
- The SDK is one more dependency whose major versions need watching.
