---
name: handoff
description: Close out a finished unit of work in julianpalomo.dev. Runs the checks, applies the "is any doc now false?" test, stages by name, commits, runs the two reviewer subagents, and writes the change summary (complex parts in English and Spanish). Use when an implementation is done, before /ship-pr.
---

# Handoff

Run these in order. Don't skip a step silently; if you skip one, the summary
says so.

## 1. Checks

```bash
pnpm check
pnpm test
```

- Add `pnpm knip` when the change touches exports, `package.json` or `pnpm-lock.yaml`.
- Add one full `pnpm eval` run, and its cost in the summary, when the change touches `evals/`, the prompt, the tools, the model's settings or a claim (`.claude/rules/evals.md`). It calls the real model.
- Add `bash .claude/hooks/tests/run.sh` when anything in `.claude/hooks/` or `biome.json` changed.
- `pnpm build` and `pnpm test:e2e` take minutes: only when the change touches routes, the build or CI, and ask first. Otherwise rely on CI's e2e job and say so.

A failure stops the handoff: report it with its output.

## 2. Leave the docs true

For every doc the change could have made false or incomplete, read what it says
now and fix it. The test is "does an existing doc now say something untrue or
incomplete?", not "did I add a feature?". Triggers per doc:
[docs-table.md](docs-table.md). A change that makes nothing untrue needs no doc
edit; say so.

## 3. What to stage

```bash
git status --short
git diff origin/main --stat
```

List the files that belong to the task. Anything else (stray untracked files,
edits from another task, `CLAUDE.local.md`) is listed under "not staged" and
left untouched. Never `git add -A`, `--all` or `.`.

## 4. Commit

```bash
git add <path> <path> …
git commit -m "<short lowercase imperative subject>"
```

Exemplar: the subjects in `git log --oneline origin/main` ("add ci workflow",
"update readme with status and commands"). No `Co-Authored-By`, no "Generated
with", no attribution of any kind. Several commits are fine when the work splits
into reviewable steps, as long as each one passes `pnpm check` on its own.

## 5. Run the reviewers

Both read-only subagents run on every handoff; this step is part of the
handoff, so don't ask first. They have no Bash, so write the branch diff for
them:

```bash
mkdir -p .diff-dump
git diff origin/main...HEAD --stat > .diff-dump/summary.txt
git diff origin/main...HEAD > .diff-dump/branch.diff
```

Then start both in one message, so they run in parallel, each in its own
context:

- `constraint-reviewer` checks the diff against AGENTS.md §1-§2 and `.claude/rules/`.
- `docs-truth-checker` finds doc sentences the diff made false.

Name any untracked task files in the prompt. `.diff-dump/` is gitignored.

For each finding, fix it in a new commit and re-run the checks from step 1, or
keep it and say why in the summary. One pass: run the reviewers again only when
the fixes are large enough to need their own review.

## 6. Summary

End with the change summary from [summary-template.md](summary-template.md).
Then `/ship-pr`.

If the exemplar's shape has changed, update this skill.
