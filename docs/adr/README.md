# Architecture decision records

This folder keeps a short record of every decision that shapes the project:
what we chose, what else we looked at, and what the choice costs us. If you've
ever opened an old codebase and wondered "why on earth is it like this?", these
files are the answer, written down at the time instead of remembered later.

## How it works

- **One file per decision**, named with the date first and a short slug, for
  example `2026-10-26-licence-split.md`. Sorting by name sorts by date.
- **Use [`template.md`](template.md)**: context, decision, alternatives
  considered, consequences.
- **Records are history.** Once a decision is accepted, its file isn't
  rewritten. If we change our minds, a new ADR explains the new decision and
  the old one gets a single line at the top: `Superseded by <new file>`.
- **Short is fine.** A good ADR is a page, not an essay.

## Decisions so far

| Date       | Decision                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 2026-10-26 | [A new repository, not a fork](2026-10-26-new-repo-not-fork.md)                                      |
| 2026-10-26 | [TanStack Start on Cloudflare](2026-10-26-tanstack-start-on-cloudflare.md)                           |
| 2026-10-26 | [The Vercel AI SDK with Claude and read-only tools](2026-10-26-ai-sdk-claude-read-only-tools.md)     |
| 2026-10-26 | [The assistant answers only from confirmed claims](2026-10-26-answers-only-from-confirmed-claims.md) |
| 2026-10-26 | [The AI-first setup](2026-10-26-ai-first-setup.md)                                                   |
| 2026-10-26 | [The site in English and Spanish](2026-10-26-english-and-spanish.md)                                 |
| 2026-10-26 | [The licence split](2026-10-26-licence-split.md)                                                     |
| 2026-10-26 | [Git rules and the issue workflow](2026-10-26-git-rules-and-issue-workflow.md)                       |
| 2026-10-27 | [Deploys with Cloudflare Workers Builds](2026-10-27-deploy-with-workers-builds.md)                   |
| 2026-10-27 | [Claims in English only](2026-10-27-claims-in-english-only.md)                                       |
| 2026-10-27 | [Claude Haiku 5.5 at low effort, on AI SDK 7](2026-10-27-claude-model-and-ai-sdk-7.md)               |
| 2026-10-28 | [The visual direction: a live Highland landscape and a cow](2026-10-28-visual-direction.md)          |
