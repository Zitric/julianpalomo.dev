# The page's language goes after the cached prompt

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

The prompt told the model to answer in the language of the visitor's last
message. Some messages don't settle it: "Python?", "Cazoo", a pasted job title.
And names inside the claims, such as "Universidad de Extremadura, Cáceres",
pulled English questions into Spanish: with Claude Sonnet 5.5, "What did Julian
study?" got a Spanish answer in two local runs out of two and again in CI. The
page settles what the message doesn't, because a visitor on `/es` reads
Spanish ([One URL per language](2026-10-28-language-urls.md)).

The system prompt is cached together with the tools, from one breakpoint on
the system message. The cache only hits when those bytes are the same on every
request, so the page's language can't be written into `SYSTEM_PROMPT`.

## Decision

The chat sends the page's language as `locale` (`en` or `es`). The endpoint
passes the model two system messages: `SYSTEM_PROMPT` with the cache
breakpoint, then a one-line note from `pageLanguageNote(locale)`, with no
breakpoint, saying which page the visitor is reading. The rule lives once, in
`SYSTEM_PROMPT`: answer in the visitor's language, use the page's only when the
message doesn't make its language clear, and never let a claim's names decide.
The note only states the fact. The Anthropic provider's docs show this pattern:
a cached system part, then an uncached one.

## Alternatives considered

- **The language inside `SYSTEM_PROMPT`.** Two prompts, each cached on its
  own: double the cache writes, and it breaks the rule that the prompt is the
  same bytes on every request.
- **A line added to the visitor's message.** It mixes an instruction into text
  that is data, never instructions, and the model, the history and the judge
  would all see it as the visitor's words.
- **The whole rule in the note.** It keeps `SYSTEM_PROMPT` untouched, but
  splits the language rule between two places, and the cached line would still
  say "the language of the visitor's last message" with no exception.

## Consequences

- Changing the prompt's language line rewrites the cache once after the deploy;
  after that, every request on either page reads the same cached prefix. The
  note is one short sentence of uncached input per call.
- A request without `locale` counts as English, so a tab opened before the
  field existed keeps working. Any other value is a `400`.
- The evals send each case's page as `locale`: the case's `page`, or its answer
  language when it has none. Cases with `page` different from `language` check
  that the visitor's language wins, and a one-word question checks that the
  page decides it.
