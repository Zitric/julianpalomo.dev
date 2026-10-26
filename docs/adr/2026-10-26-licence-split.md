# The licence split

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The repository mixes two kinds of material. The code is generic and I'm happy
for anyone to learn from or reuse it. The facts about me, my CV and my photos
are personal, and a permissive licence on them would allow anyone to republish
or repurpose them, including as training data.

## Decision

Two sets of terms in one [`LICENSE`](../../LICENSE) file:

1. **Source code, configuration and documentation:** MIT.
2. **Personal content** (facts and biographical text about me, including the
   data the assistant answers from; CV documents; photos and avatars; the
   written text of the pages about me): all rights reserved, not licensed for
   reuse.

## Alternatives considered

- **MIT for everything.** Simplest, but it would license my CV for reuse.
- **No licence at all.** Then nobody may legally reuse the code either, which
  isn't what I want for a learning project.

## Consequences

- Anyone copying code from here needs to leave the personal files behind. The
  `LICENSE` file says so at the top.
- New kinds of personal content should be checked against section 2 when they
  are added.
