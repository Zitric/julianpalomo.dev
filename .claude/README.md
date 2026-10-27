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

| File                            | What it does                                                                                                                                                                                                                                                                                                                                                                       | When it runs                                             | How you trigger it                |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------- |
| `../AGENTS.md`, `../CLAUDE.md`  | One line per hard constraint, the workflow, commands, where things live, the docs map. `CLAUDE.md` is a symlink, never a copy                                                                                                                                                                                                                                                      | Every session                                            | Automatic                         |
| `rules/comments.md`             | The comment register: present-tense facts, no history or attribution                                                                                                                                                                                                                                                                                                               | Touching any code file                                   | Automatic                         |
| `rules/react-and-typescript.md` | Strict TS, Zod at boundaries, React 19, `createServerFn` + `.validator()`, secrets only on the server                                                                                                                                                                                                                                                                              | Touching any `.ts` / `.tsx`                              | Automatic                         |
| `rules/styling.md`              | Colours only in `tokens.css`, no `dark:` variants, Tailwind utilities only                                                                                                                                                                                                                                                                                                         | Touching `src/**/*.tsx` / `.css`                         | Automatic                         |
| `rules/tests.md`                | Standalone `vitest.config.ts`, unit and e2e layout, exemplar tests                                                                                                                                                                                                                                                                                                                 | Touching tests or test configs                           | Automatic                         |
| `rules/claims.md`               | Never confirm or reword a claim, reset a changed claim to `null`, only `src/lib/claims.ts` reads the JSON, no private data                                                                                                                                                                                                                                                         | Touching `src/content/`, `src/lib/claims.ts` or its test | Automatic                         |
| `rules/ci.md`                   | The four CI jobs, the shared setup block, actions pinned to SHAs                                                                                                                                                                                                                                                                                                                   | Touching `.github/workflows/`                            | Automatic                         |
| `skills/handoff/`               | Checks, the "is any doc now false?" test, stage by name, commit, both reviewer subagents, change summary (complex parts in English and Spanish)                                                                                                                                                                                                                                    | End of a task                                            | `/handoff` (or Claude, when done) |
| `skills/ship-pr/`               | Identity check, push, `gh pr create` with `Closes #N` assigned to you, CI report, never merge                                                                                                                                                                                                                                                                                      | After handoff                                            | `/ship-pr`                        |
| `skills/implement-issue/`       | Reads an issue, creates its branch, plans, implements, then handoff and ship-pr                                                                                                                                                                                                                                                                                                    | Starting an issue                                        | `/implement-issue <N>`            |
| `agents/constraint-reviewer.md` | Reads the branch diff against AGENTS.md §1-§2 and the rules, reports `file:line` findings (Sonnet)                                                                                                                                                                                                                                                                                 | Every handoff                                            | `/handoff`                        |
| `agents/docs-truth-checker.md`  | Finds doc sentences the diff made false (Sonnet, starts without `AGENTS.md` in context)                                                                                                                                                                                                                                                                                            | Every handoff                                            | `/handoff`                        |
| `hooks/guard-bash.sh`           | Blocks stash, `add -A`/`--all`/`.`, amend, rebase, force-push, push to `main`, merging, attribution and identity changes, and any command that could write `claims.json` (reading it, `git add` and `git commit` pass; `gh pr create`/`edit` naming it don't); asks before discarding changes (`git checkout <path>`, `git restore`), builds, e2e, dependency changes and wrangler | Before every Bash command                                | Automatic                         |
| `hooks/guard-claims.sh`         | Blocks an edit to `src/content/claims.json` that sets or changes a `confirmedByJulian` date, or changes a confirmed claim without resetting its date to `null`, or leaves the file invalid JSON                                                                                                                                                                                    | Before every edit                                        | Automatic                         |
| `hooks/format-on-edit.sh`       | `biome check --write` on the edited file                                                                                                                                                                                                                                                                                                                                           | After every edit                                         | Automatic                         |
| `hooks/check-invariants.sh`     | Flags anything that looks like an Anthropic API key or a UK phone number, and invisible or non-breaking characters in source                                                                                                                                                                                                                                                       | After every edit                                         | Automatic                         |
| `hooks/lib.sh`                  | Shared helpers: reads the hook input with jq, or node when jq is missing                                                                                                                                                                                                                                                                                                           | Sourced by the hooks                                     | -                                 |
| `hooks/tests/`                  | The case table for `guard-bash.sh` and fixtures for the other three                                                                                                                                                                                                                                                                                                                | When a hook changes                                      | `bash .claude/hooks/tests/run.sh` |
| `settings.json`                 | Permissions (deny, ask, allow), the hooks, `attribution` turned off                                                                                                                                                                                                                                                                                                                | Always                                                   | Automatic                         |
| `../.mcp.json`                  | Cloudflare's documentation MCP server (read-only docs, no account access)                                                                                                                                                                                                                                                                                                          | Always, once approved                                    | `/mcp` to see it                  |

## A day of work

1. **Pick an issue.** `/implement-issue 12` reads it (and its epic), creates the branch and starts planning.
2. **Plan.** Claude proposes and edits nothing until you approve. Shift+Tab cycles into plan mode by hand.
3. **Code.** Claude implements on the new branch; the hooks format each edit and block what's forbidden.
4. **`/handoff`.** Checks, docs, commit, both reviewer subagents, change summary with a Review section.
5. **`/ship-pr`.** Push, PR (its body has the same Review section), CI report. You review and merge; the cloud session can review the PR too.

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
- **Test the hooks:** `bash .claude/hooks/tests/run.sh`. It doesn't run in CI yet (`docs/tech-debt.md`).
