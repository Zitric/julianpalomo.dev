# Claude Haiku 5.5 at low effort, on AI SDK 7

- **Status:** Accepted
- **Date:** 2026-10-27

## Context

The assistant needs a model.
[The earlier ADR](2026-10-26-ai-sdk-claude-read-only-tools.md) left the choice
for when the bot is built, against current prices. Prices on Anthropic's
pricing page on 27 October 2026, per million tokens (input / output):

| Model             | Input | Output |
| ----------------- | ----- | ------ |
| Claude Haiku 5.5  | $0.10 | $0.50  |
| Claude Sonnet 5.5 | $2    | $10    |
| Claude Opus 5.5   | $4    | $20    |

The model's job is narrow: look claims up with read-only tools and restate
them, citing each one. Answers are short.

The same ADR names the Vercel AI SDK at v6. Its current major is 7.

Cloudflare preview deployments don't inherit the production Worker's secrets.

## Decision

- **Claude Haiku 5.5 (`claude-haiku-5-5`) at `low` effort.** It costs about a
  twentieth of Sonnet 5.5, so the planned daily spending cap goes much further. Effort
  is set explicitly because this model defaults to `medium`; temperature and
  the other sampling settings are left alone, since the model rejects
  non-default values.
- **The AI SDK at v7**, with the matching `@ai-sdk/anthropic` major.
- **The bot is off on previews.** They have no API key, and the endpoint
  answers "not available" without calling the model. Julian decided this on
  27 October 2026. Cloudflare Access on previews could turn it on later without
  changing the bot's code.

## Alternatives considered

- **Claude Sonnet 5.5** ($2 / $10). Stronger, at twenty times the price. It is
  the next step if the evals show Haiku 5.5 overclaiming.
- **Claude Opus 5.5** ($4 / $20). Far more capability than looking claims up
  needs, at forty times the price.
- **Staying on AI SDK v6.** It would mean starting a new codebase on a major
  that is no longer current, and migrating it later.

## Consequences

- Changing the model is one constant in `src/lib/bot/model.ts`.
- The evals decide whether Haiku 5.5 at low effort holds up: they can raise
  the effort or move to Sonnet 5.5.
- Previews can't show real answers; the real bot is tried locally with a key in
  `.dev.vars`.
- The system prompt and the tools are cached. Haiku 5.5 caches prompts of 512
  tokens or more, so the prompt has to stay byte-stable between requests to
  get the cheaper cached reads.
