---
name: implement-issue
description: Implement a julianpalomo.dev GitHub issue end to end. Reads it with gh, creates its branch, plans in plan mode, implements, then runs /handoff and /ship-pr. Use when asked to implement, build or work on an issue by number.
argument-hint: "[issue-number]"
---

# Implement issue #$ARGUMENTS

GitHub issues are the bridge: the cloud session, which holds the design
context, writes them; this session implements them. Exemplar of a well-formed
issue: #4 (`gh issue view 4`), with numbered sections and a "Done when" list.

## 1. Read

```bash
gh issue view $ARGUMENTS
```

- If it says "Part of #M", read #M too: the epic holds the rules for every sub-issue.
- If it depends on another issue ("after #3"), check that one is closed (`gh issue view 3 --json state`) and its PR merged into `origin/main`. If not, stop and say so.
- If the issue and the code disagree, or the issue is ambiguous, **ask** before choosing. Quote the line and say what the code does instead.

## 2. Branch

```bash
git fetch origin
git switch -c <type>/<short-slug> origin/main
```

`<type>` is `feat`, `fix`, `chore` or `docs`, matching the issue. One issue, one
branch. If the working tree has someone else's changes, leave them and say so;
never stash.

## 3. Plan

Enter plan mode. Read the files the issue names and every `.claude/rules/*.md`
whose `paths:` match them. The plan lists:

- each file to add or change, and why;
- each decision the issue leaves open, with a recommendation;
- the checks that will prove "Done when", and any that need Julián (a new Claude Code session, Cloudflare, a phone).

Wait for approval. If the work is heavy (many files, a build, an e2e run), say
so in one line before starting.

## 4. Implement

Build what the plan says, nothing more. The hooks format each edit and block
forbidden commands; when one blocks something, change course. Split the work
into commits that each pass `pnpm check` on their own.

## 5. Finish

Run `/handoff`, then `/ship-pr` with `Closes #$ARGUMENTS` (and `Part of #M`).
Never merge.

If the exemplar's shape has changed, update this skill.
