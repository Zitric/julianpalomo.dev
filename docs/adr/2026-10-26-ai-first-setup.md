# The AI-first setup

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

I build this site with Claude Code. I decide what gets built, Claude writes
most of the code, and nothing reaches `main` until I've reviewed it. Agents
follow instructions well when the instructions are short, specific and close
to the code they're about, and they can forget or bend rules that live only
in prose. In Form:at, the most important rules are each backed by a hook or a
test, because written rules alone were broken more than once.

I've also worked in a large production monorepo that set up its agents
differently, with ideas worth keeping.

## Decision

Combine both approaches.

From Form:at, **enforcement**:

- one line per hard constraint in the main instructions file;
- rules in `.claude/rules/` that load only when the agent touches matching
  files;
- hooks that block dangerous commands, format on edit and check invariants,
  each with its own tests;
- skills for repeatable procedures (hand-off, opening a PR) and reviewer
  subagents.

From the monorepo, **portability and grounding**:

- `AGENTS.md` as the main instructions file, read by many coding agents, with
  `CLAUDE.md` as a symlink to it;
- skills that point at real example files in the repo instead of describing
  code in the abstract;
- Zod schemas for everything that enters the app;
- lefthook running Biome before each commit.

## Alternatives considered

- **Only a `CLAUDE.md`.** Simple, but nothing enforces it and other agents
  don't read it.
- **Copy Form:at's `.claude/` folder as it is.** Most of it is specific to a
  music PWA, and copied rules that describe files that don't exist teach the
  agent to ignore rules.

## Consequences

- The setup is itself part of the portfolio: the planned "How it's built" page
  will link to these files.
- Keeping `CLAUDE.md` as a symlink matters. Per Claude Code's docs, if a
  `CLAUDE.local.md` exists and no `CLAUDE.md` does, Claude reads the local
  file instead of `AGENTS.md`.
- Hooks and rules are code too: they need tests and upkeep as the project
  changes.
