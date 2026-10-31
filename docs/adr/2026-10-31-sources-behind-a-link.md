# An answer's sources fold behind a "Check sources" link

- **Status:** Accepted
- **Date:** 2026-10-31

## Context

Every finished answer showed its source chips in a row under the text, such
as "1 · CV · Core skills" and "2 · CV · Frontend skills". Answers are now
short and light, so the row often took as much room as the answer itself.
Julian asked on 30 Oct for the sources to have less presence: a link under the
answer, with the sources appearing when it's tapped.

Sources are still what sets the assistant apart (`DESIGN.md` section 10,
"Citations are buttons"): a visitor can see which confirmed claim every
sentence comes from. So they had to stay one tap away, not go.

## Decision

A finished answer with sources shows one small `accent` text link, "Check
sources (N)" ("Ver fuentes (N)"). Tapping it shows the numbered chips, rising
in as before, and the link becomes "Hide sources" ("Ocultar fuentes"); hiding
them also closes an open claim. The inline citation numbers stay, and tapping
one opens its claim and the list with it. Each answer starts closed and keeps
its own state only while the page is open. Copy still copies the sources.

## Alternatives considered

- **Hide the inline numbers too.** The answer would read cleanest, but nothing
  in the text would point to a claim any more, and the numbers take almost no
  room. Julian can still ask for it.
- **Smaller chips, always shown.** Less room, but still a row under every
  answer, which is what Julian asked to lighten.
- **Remember the choice across answers or visits.** One open list would open
  every later answer's, which is the clutter this removes, and it would need a
  cookie or storage for a small convenience.

## Consequences

- An answer takes one line under its text instead of a row of chips.
- Reaching a claim from the list takes one tap more; from an inline number it
  takes the same one tap.
- `nextSources` and `sourcesLinkLabel` in `src/components/chat/chat-view.ts`
  hold the toggle's rules, unit-tested without a DOM. The e2e opens the list
  before it checks a chip.
