# AGENTS.md

The source of julianpalomo.dev: Julián Palomo's personal site, with an
assistant that answers questions about his experience only from facts he has
confirmed. A TanStack Start app (React 19, strict TypeScript, Tailwind CSS 4)
for Cloudflare Workers. Today it is one page with the chat; `README.md` has
the status and the plan.

This file is the single source of agent instructions. `CLAUDE.md` is a symlink
to it, so Claude Code and every other agent read the same text. Never replace
the symlink with a copy.

## 1. Hard constraints

- Only Julián sets a claim's `confirmedByJulian` date. An agent may propose a claim with `confirmedByJulian: null`, never confirm one.
- No private data in the repo: no phone number, personal email address or home address, and nothing internal from past employers (PR numbers, colleagues' names, internal URLs).
- The Anthropic API key is read only on the server and never reaches the browser bundle.
- Only Julián merges. Never `gh pr merge`, never enable auto-merge.
- Never push to `main`. Branches are `feat/…`, `fix/…`, `chore/…` or `docs/…`.
- Commits use the repo owner's git identity. No `Co-Authored-By`, no "Generated with", no Claude or AI attribution in commits or PR bodies.
- Stage files by name. No `git add -A`, no stash, no amend, no force-push.
- Everything in the repo is in English.

`.claude/hooks/guard-bash.sh` and `.claude/hooks/check-invariants.sh` enforce
the git and private-data lines, and `.claude/hooks/guard-claims.sh` (with a
matching check in `guard-bash.sh`) the `confirmedByJulian` line. When a hook
blocks something, change course; don't look for another way to run it.

## 2. Workflow

- **GitHub issues are the spec.** One issue, one branch from an up-to-date `origin/main`, one PR whose body says `Closes #N`. The epic an issue belongs to holds the shared rules; read it too.
- **One branch, one driver.** A branch is worked on by one session only; another session reads and comments on the PR.
- **If the issue and the code disagree, ask** instead of choosing.
- Explore, plan, implement, then `/handoff` (checks, docs, commit, both reviewer subagents, change summary) and `/ship-pr` (push, PR, CI). `/implement-issue <N>` runs the whole loop.
- Each commit typechecks and builds on its own. Subjects are short, lowercase and imperative ("add …", "fix …").

## 3. Commands

| Command                           | What it does                                                  |
| --------------------------------- | ------------------------------------------------------------- |
| `pnpm dev`                        | Dev server.                                                   |
| `pnpm check`                      | Biome (lint and format), then `tsc`. Run before every commit. |
| `pnpm test`                       | Vitest unit tests, once.                                      |
| `pnpm knip`                       | Unused files, exports and dependencies.                       |
| `pnpm build`                      | Production build into `dist/`. Takes a while: ask first.      |
| `pnpm preview`                    | Serves the last build in the local Workers runtime.           |
| `pnpm test:e2e`                   | Builds, serves and runs Playwright in Chromium. Ask first.    |
| `pnpm eval`                       | Evals: the real bot and its judge. Costs money (`evals.md`).  |
| `bash .claude/hooks/tests/run.sh` | Tests for the Claude Code hooks.                              |
| `pnpm db:migrate:local`           | Applies the D1 migrations to the local database only.         |

`pnpm add` and `pnpm install` change the lockfile: ask first. Nothing writes to
Cloudflare without Julián, except the preview build Workers Builds runs when a
branch is pushed. Production deploys only when he merges, and agents never run
wrangler commands that change Cloudflare.

## 4. Where things live

- `src/routes/`: file-based routes. `src/routeTree.gen.ts` is generated; never edit it by hand.
- `src/lib/`: plain TypeScript modules, such as `site.ts`.
- `src/lib/bot/`: the assistant: model settings, the system prompt, the read-only tools, the citation parser, demo mode, the daily limits and the chat logic. `src/routes/api/chat.ts` is its endpoint, `POST /api/chat`.
- `migrations/`: D1 migrations for the daily limits. `pnpm db:migrate:local` applies them locally; only Julián applies them to production.
- `src/components/`: React components, one folder per feature, such as `chat/` (the chat on the home page).
- `src/content/`: personal content, such as `claims.json`. It isn't MIT (`LICENSE`, section 2), and in `src/` only `src/lib/claims.ts` reads it.
- `src/styles/tokens.css`: the only place colours are defined.
- `evals/`: the evals: cases, code checks, the judge and its calibration, the runner and its report, run by `pnpm eval` with `vitest.evals.config.ts` (`.claude/rules/evals.md`).
- `tests/unit/`: Vitest. `tests/e2e/`: Playwright, against a production build of the `e2e` environment, in demo mode (`.claude/rules/tests.md`).
- `.github/workflows/ci.yml`: CI on every pull request to `main`. Deploys aren't here: Cloudflare Workers Builds deploys `main` and comments a preview URL on every PR.
- `docs/adr/`: one file per decision. `docs/tech-debt.md`: shortcuts taken on purpose.
- `.claude/`: rules, hooks, skills and subagents for Claude Code; `.claude/README.md` explains them.

## 5. Docs map

- `README.md`: what the project is, its status and the commands. Read first by outsiders.
- `docs/architecture.md`: how a question is answered, step by step, with a diagram. Update it when a step changes.
- `DESIGN.md`: how the site looks, moves and sounds, with reference artwork in `docs/design/`. A visual change starts there.
- `docs/adr/README.md`: the index of decisions. Records are history; a change of mind is a new ADR.
- `docs/tech-debt.md`: add a row when you take a shortcut.
- `.claude/rules/*.md`: per-area rules. Each starts with a `paths:` list; before editing a file, read every rule whose paths match it.
- `.claude/skills/*/SKILL.md`: step-by-step procedures (handoff, opening a PR, implementing an issue).
