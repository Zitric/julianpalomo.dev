# The assistant answers only from confirmed claims

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Language models fill gaps with plausible guesses. For a bot that talks about a
real person to recruiters, a confident wrong answer ("yes, he led that
migration") is worse than no answer. AI-written CV text can also drift away
from what actually happened, one reasonable-sounding sentence at a time.

## Decision

The assistant can only use **claims**: short statements about my experience
that I have approved one by one.

- Each claim has an id, its text, where it comes from, and the date I confirmed
  it (`confirmedByJulian`). A claim can also have a longer version with more
  context than the CV; I confirm that one too.
- **Unconfirmed claims never reach the model.** They can sit in the data file
  while I review them, but the server filters them out.
- **Claude never confirms a claim.** It may propose one with
  `confirmedByJulian: null`. Only I set the date. A test and a hook will
  enforce this when the claims are built.
- **Every answer cites its claims**, and the server checks that each cited id
  exists before showing it as a source.
- **When the data doesn't cover a question, the assistant says so** and offers
  my contact details. When someone pastes a job ad, gaps are listed as gaps.
- **No private data and no former employers' internals** in the claims: no
  phone number, personal email or address, no internal names or links.

## Alternatives considered

- **Let the model answer from a CV document.** Faster to set up, but nothing
  stops it from embellishing, and nothing proves where an answer came from.
- **Trust the system prompt to keep it honest.** Prompts help, but they're
  instructions, not guarantees.

## Consequences

- Adding to what the bot knows is slower: every line needs my approval.
- Answers can be checked automatically. The evals (questions designed to
  tempt the bot into overclaiming, graded against a rubric) rely on this.
- "I don't know" is a feature. The analytics will track which questions get
  it, so I can see what's worth adding.
