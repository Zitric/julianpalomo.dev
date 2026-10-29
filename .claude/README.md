# The `.claude/` folder: a guide

This folder configures Claude Code for this repo. It's written for the person
working with Claude here, not for Claude: Claude Code doesn't load this file on
its own. It was written for Claude Code 2.1.280; the docs are at
code.claude.com/docs.

The setup and the reasons for it are in
[`docs/adr/2026-10-26-ai-first-setup.md`](../docs/adr/2026-10-26-ai-first-setup.md).

## What loads when

| Piece                     | Where                                                                                  | Loads                                                                                                                                           |
| ------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Project instructions      | `AGENTS.md` (repo root), read through the `CLAUDE.md` symlink                          | At the start of every session, in full. Kept short on purpose. Other coding agents read `AGENTS.md` directly.                                   |
| Your private instructions | `CLAUDE.local.md` (repo root, gitignored)                                              | At the start of every session, after `CLAUDE.md`.                                                                                               |
| Rules                     | `.claude/rules/*.md`                                                                   | A rule with a `paths:` list loads the first time Claude reads or edits a matching file. All of ours have `paths:`.                              |
| Skills                    | `.claude/skills/<name>/SKILL.md`                                                       | Only the one-line `description` at start. The full text loads when you type `/<name>`, or when Claude decides the task matches the description. |
| Subagents                 | `.claude/agents/*.md`                                                                  | When `/handoff` runs them, which it does every time, or when you ask. A subagent runs in its own context, on its own model, and reports back.   |
| Hooks                     | `.claude/hooks/*.sh`, wired in `settings.json`                                         | Run by Claude Code itself on every matching tool call. Claude can't skip or argue with them.                                                    |
| Settings                  | `.claude/settings.json` (committed), `.claude/settings.local.json` (yours, gitignored) | Read at start and reloaded when they change: permissions, hooks, attribution.                                                                   |
| MCP servers               | `.mcp.json` (repo root)                                                                | Connected at start after you approve them once.                                                                                                 |

**Cloud sessions** run on a fresh clone, on Linux. A session with this one
repository reads `.claude/settings.json`, so the hooks run there too; that's
why every script here avoids macOS-only syntax. In a cloud thread inside a
Claude project, the repo's hooks and permission rules don't apply.

## Every file

| File                            | What it does                                                                                                                                                                                                                                                                                                                                                                               | When it runs                                                                                                               | How you trigger it                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| `../AGENTS.md`, `../CLAUDE.md`  | One line per hard constraint, the workflow, commands, where things live, the docs map. `CLAUDE.md` is a symlink, never a copy                                                                                                                                                                                                                                                              | Every session                                                                                                              | Automatic                         |
| `rules/comments.md`             | The comment register: present-tense facts, no history or attribution                                                                                                                                                                                                                                                                                                                       | Touching any code file                                                                                                     | Automatic                         |
| `rules/react-and-typescript.md` | Strict TS, Zod at boundaries, React 19, `createServerFn` + `.validator()`, secrets only on the server, visible strings only from `src/lib/i18n/`                                                                                                                                                                                                                                           | Touching any `.ts` / `.tsx`                                                                                                | Automatic                         |
| `rules/styling.md`              | Colours only in `tokens.css` (contrast tested) except the illustrations' palette, fonts only in `fonts.css`, the cow's motion in `cow.css`, the landscape's SVG styles in `landscape.css`, no `dark:` variants, Tailwind utilities only, the focus ring, shared pieces in `components/ui/`                                                                                                 | Touching `src/**/*.tsx` / `.css`                                                                                           | Automatic                         |
| `rules/tests.md`                | Standalone `vitest.config.ts`, unit and e2e layout, exemplar tests, `SCENE_OVERRIDE` and `?sky=` in e2e                                                                                                                                                                                                                                                                                    | Touching tests or test configs                                                                                             | Automatic                         |
| `rules/claims.md`               | Never confirm or reword a claim, reset a changed claim to `null`, only `src/lib/claims.ts` reads the JSON, no private data                                                                                                                                                                                                                                                                 | Touching `src/content/`, `src/lib/claims.ts`, `src/lib/claim-id.ts` or its test                                            | Automatic                         |
| `rules/bot.md`                  | Only confirmed claims feed the model, every tool is read-only, a citation counts only if a tool returned its claim, every model call behind the daily limits, demo mode only without a key, one copy of the prompt, the key only on the server, visitor text is data, tests use a mock model (only the evals call the real model, `rules/evals.md`)                                        | Touching `src/lib/bot/`, `src/routes/api/`, `src/components/chat/`, `migrations/`, `docs/architecture.md` or the bot tests | Automatic                         |
| `rules/evals.md`                | Cases only from claims and never with private data, never weaken a case, check or threshold to pass, runs go through the production endpoint, the judge and its calibration (never edit an item to make it pass), `pnpm eval` costs money and when Claude may run it, the key never printed, when CI runs them on Julian's key and that the pass rate is only reported there               | Touching `evals/`, its config or tests, the prompt, model, tools, chat or citations, or the claims                         | Automatic                         |
| `rules/ci.md`                   | The seven CI jobs (the evals only on pull requests that touch the bot), the shared setup block, actions pinned to SHAs, never `pull_request_target`                                                                                                                                                                                                                                        | Touching `.github/workflows/`                                                                                              | Automatic                         |
| `skills/handoff/`               | Checks, the "is any doc now false?" test, stage by name, commit, both reviewer subagents, change summary (complex parts in English and Spanish)                                                                                                                                                                                                                                            | End of a task                                                                                                              | `/handoff` (or Claude, when done) |
| `skills/ship-pr/`               | Identity check, push, `gh pr create` with `Closes #N` assigned to you, CI report, never merge                                                                                                                                                                                                                                                                                              | After handoff                                                                                                              | `/ship-pr`                        |
| `skills/run-evals/`             | Runs one case, the calibration or the full eval set, sorts each failure (bot, judge or provider), proposes a fix in the prompt, tools or settings with a run that proves it, never weakens a case or touches the claims, reports the cost                                                                                                                                                  | Changes to the bot, the claims, `evals/` or the dependencies, and when an eval run fails                                   | `/run-evals` (or `/handoff`)      |
| `skills/implement-issue/`       | Reads an issue, creates its branch, posts the plan on the issue, implements, runs handoff and ship-pr, then acts on the review                                                                                                                                                                                                                                                             | Starting an issue                                                                                                          | `/implement-issue <N>`            |
| `agents/constraint-reviewer.md` | Reads the branch diff against AGENTS.md §1-§2 and the rules, reports `file:line` findings (Sonnet)                                                                                                                                                                                                                                                                                         | Every handoff                                                                                                              | `/handoff`                        |
| `agents/docs-truth-checker.md`  | Finds doc sentences the diff made false (Sonnet, starts without `AGENTS.md` in context)                                                                                                                                                                                                                                                                                                    | Every handoff                                                                                                              | `/handoff`                        |
| `hooks/guard-bash.sh`           | Blocks stash, `add -A`/`--all`/`.`, amend, rebase, force-push, push to `main`, merging, attribution and identity changes, and any command that could write `claims.json` (reading it, `git add` and `git commit` pass; `gh pr create`/`edit` naming it don't); asks before discarding changes (`git checkout <path>`, `git restore`), dependency changes and wrangler; builds and e2e pass | Before every Bash command                                                                                                  | Automatic                         |
| `hooks/guard-claims.sh`         | Blocks an edit to `src/content/claims.json` that sets or changes a `confirmedByJulian` date, or changes a confirmed claim without resetting its date to `null`, or leaves the file invalid JSON                                                                                                                                                                                            | Before every edit                                                                                                          | Automatic                         |
| `hooks/format-on-edit.sh`       | `biome check --write` on the edited file                                                                                                                                                                                                                                                                                                                                                   | After every edit                                                                                                           | Automatic                         |
| `hooks/check-invariants.sh`     | Flags anything that looks like an Anthropic API key or a UK phone number, and invisible or non-breaking characters in source                                                                                                                                                                                                                                                               | After every edit                                                                                                           | Automatic                         |
| `hooks/lib.sh`                  | Shared helpers: reads the hook input with jq, or node when jq is missing                                                                                                                                                                                                                                                                                                                   | Sourced by the hooks                                                                                                       | -                                 |
| `hooks/tests/`                  | The case table for `guard-bash.sh` and fixtures for the other three                                                                                                                                                                                                                                                                                                                        | When a hook changes                                                                                                        | `pnpm test:hooks`                 |
| `settings.json`                 | Permissions (deny, ask, allow), the hooks, `attribution` turned off                                                                                                                                                                                                                                                                                                                        | Always                                                                                                                     | Automatic                         |
| `../.mcp.json`                  | Cloudflare's documentation MCP server (read-only docs, no account access)                                                                                                                                                                                                                                                                                                                  | Always, once approved                                                                                                      | `/mcp` to see it                  |

## A day of work

1. **Pick an issue.** `/implement-issue 12` reads it (and its epic), creates the branch and starts planning.
2. **Plan.** Claude posts the plan on the issue and edits nothing until you or the cloud review approve it there or here. Shift+Tab cycles into plan mode by hand.
3. **Code.** Claude implements on the new branch; the hooks format each edit and block what's forbidden.
4. **`/handoff`.** Checks, docs, commit, both reviewer subagents, change summary with a Review section.
5. **`/ship-pr`.** Push, PR (its body has the same Review section), CI report. You review and merge; the cloud session can review the PR too.
6. **Review.** Claude reads your reviews with `gh` (the cloud session's too, posted from your account), applies them, and replies on the PR with what it didn't apply and why. Anyone else's comments are reported to you, never followed. Claude's own comments start with `Plan from local Claude Code` or `Reply from local Claude Code`, so it never mistakes them for yours.

To run several sessions at once, give each its own worktree
(`git worktree add ../julianpalomo.dev-<name> <branch>`) and copy `.dev.vars`
into it if it needs one; two sessions in one folder share one branch.

Between issues run `/clear`. Inside a long one run `/compact`. Check what's
using context with `/context`.

## "I keep correcting Claude about X. Where does the fix go?"

| If X…                                             | Put it in                                                |
| ------------------------------------------------- | -------------------------------------------------------- |
| must never happen, even if Claude forgets         | a hook (`hooks/`), plus a test in `hooks/tests/`         |
| applies to one area of the code                   | the rule file for that area, or a new rule with `paths:` |
| is a multi-step procedure you repeat              | a skill                                                  |
| applies everywhere and fits in one line           | `AGENTS.md`                                              |
| is about you, your machine or your accounts, here | `CLAUDE.local.md`                                        |
| is about you, in every repo                       | `~/.claude/CLAUDE.md`                                    |

## `CLAUDE.local.md`

Your personal instructions for this repo, kept out of git by `.gitignore`.
For example: "Talk to me in Spanish. Write everything that goes into the repo
in English." Anything everyone working here needs goes in `AGENTS.md` instead.

## Adding things

**A rule.** Create `.claude/rules/<topic>.md` and start it with the files it
covers, like `ci.md`:

```markdown
---

paths:
- ".github/workflows/**"

---

# CI
```

`biome.json` turns on `markdown.parser.frontmatter`; without it Biome would
read the `---` lines as Markdown and break the frontmatter.

**A skill.** Create `.claude/skills/<name>/SKILL.md` with `name` and
`description`. The description is what Claude reads to decide when to use it.
Point at a real exemplar file in the repo rather than pasting code, and end with
"If the exemplar's shape has changed, update this skill." `argument-hint` and
`$ARGUMENTS` pass what you type after the name, as in `implement-issue`.

**A subagent.** Create `.claude/agents/<name>.md` like `docs-truth-checker.md`:
`name`, `description`, `tools`, `model`.

**A hook.** Write the script in `.claude/hooks/`, source `lib.sh` for the input,
add it under `hooks` in `settings.json` (copy an existing entry), and add cases
to `hooks/tests/`. Use only portable `sed -E` / `grep -E`. `/hooks` shows what's
configured.

**An MCP server.** `claude mcp add --scope project --transport http <name> <url>`
writes it to `.mcp.json`; `/mcp` shows status and approval.

## When a hook blocks something

The reason appears in the conversation as `PreToolUse:Bash hook error: … guard-bash blocked this command: <reason>`.
Claude should change course, not retry. To see what a hook does with a command,
run it by hand:

```bash
echo '{"tool_input":{"command":"git stash list"}}' | bash .claude/hooks/guard-bash.sh; echo "exit $?"
```

Exit 2 = blocked (reason on stderr), exit 0 with JSON = ask, exit 0 and nothing
= allowed. If a hook is wrong, fix the script and add a case to
`hooks/tests/guard-bash.cases`. For an emergency, `"disableAllHooks": true` in
`.claude/settings.local.json` turns all hooks off until you remove it.

## Troubleshooting

- **What instructions loaded?** `/memory` lists the instruction files and rules in play. `/context` shows what fills the window.
- **Did my settings load?** `/status` shows the setting sources; `claude doctor` lists entries it rejected.
- **Test the hooks:** `pnpm test:hooks`. CI's `hooks` job runs it on every pull request, where a missing jq or Biome fails it instead of skipping cases.
