# Git rules and the issue workflow

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

Two Claude sessions help with this project:

- a cloud session that holds the design context, writes specs and reviews
  pull requests;
- Claude Code on my machine, which writes most of the code.

Both can commit. Without clear rules they could work on the same branch at
once, or merge things I haven't read. The repository is also my public
portfolio, so my contribution graph should reflect the work.

## Decision

- **GitHub issues are the bridge.** Work is specified in an issue, built on its
  own branch, and delivered as a pull request that says `Closes #N`.
- **One branch, one driver.** A branch belongs to one session at a time.
  Nobody pushes to a branch another session is working on.
- **Only I merge.** No agent merges a pull request or enables auto-merge.
- **Commits are authored under my identity**, with no AI attribution
  trailers, so they count on my profile and match my other repositories. How
  the code is written, with Claude Code, is documented openly in `AGENTS.md`
  and these records instead.
- **No force-pushes or history rewrites** on shared branches.

## Alternatives considered

- **Markdown task files in the repository.** Versioned with the code and
  readable offline, but harder to follow at a glance, and they don't close
  themselves when a pull request merges.
- **Letting the agents merge green pull requests.** Faster, but nothing reaches
  `main`, which is what's deployed, without me reading it.

## Consequences

- Issues are public. They must never contain personal data or anything
  internal to a former employer.
- Every change waits for my review, which is the point.
- These rules go into `AGENTS.md` when it's written, so every agent session
  starts with them.
