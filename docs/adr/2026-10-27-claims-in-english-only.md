# Claims in English only

- **Status:** Accepted
- **Date:** 2026-10-27

## Context

The site is in English and Spanish, and the assistant answers in the
visitor's language ([the language ADR](2026-10-26-english-and-spanish.md)).
That record left open how claims work in Spanish and how I confirm those
versions. The claims are now being built: each one is a short text I review
and date by hand before the assistant may use it.

## Decision

Each claim has one text, in English. The assistant answers in the visitor's
language, translating as it answers, just as it already rephrases in English
rather than quoting.

## Alternatives considered

- **An English and a Spanish text per claim, both confirmed.** Twice the review
  now and on every change, and two texts that will drift apart.

## Consequences

- I confirm each claim once.
- The evals need Spanish cases that check a translated answer adds nothing the
  claim doesn't say.
