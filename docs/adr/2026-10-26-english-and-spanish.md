# The site in English and Spanish

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

I'm based in the UK, so most visitors will read English. I'm also a Spanish
speaker, and I want Spanish-speaking visitors to be able to read the site in
their own language.

## Decision

- **The site is bilingual**, with a language toggle that works like the
  light/dark switch.
- **The assistant answers in the selected language**, from the same set of
  claims. There's one source of truth, not two CVs.
- **Everything in the repository is in English**: code, comments, commits,
  issues, pull requests and docs, because the repository is public.

## Alternatives considered

- **English only.** Less work, but it leaves out part of the audience I want
  to reach.
- **Two separate sites or claim sets.** They would drift apart.

## Consequences

- Every page text exists twice, and the UI must handle both without layout
  breaks (Spanish runs longer).
- How claims are shown in Spanish, and how I confirm those versions, is
  decided when the claims are built.
- The evals need cases in both languages.
