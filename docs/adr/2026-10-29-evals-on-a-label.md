# The CI evals run on a label, not on every push

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

[Evals in CI](2026-10-28-evals-in-ci.md) made the `evals` job in
`.github/workflows/ci.yml` run on every push to a pull request whose diff
touches the bot's paths. One run costs about $0.70 (the bot about $0.25, the
judge about $0.38, the calibration about $0.09), so a pull request with five
pushes costs about $3.50. Most of those runs measure nothing new: a doc fix, a
review nit or a merge of `main` pays for a full run again.

The paths also catch pull requests that barely touch the bot. A new dependency
changes `package.json` and `pnpm-lock.yaml`, and a UI-only change in `chat.ts`
or `citations.ts` triggers a run too. Some of these paths do change what the
model sees: `prompt.ts` imports `site.ts`, so a new role there changes the
prompt. Narrowing the list would miss real changes. The question is when to
pay, not which paths count.

## Decision

Julian's decision: the `evals` job runs only when the `run-evals` label is
added to a pull request whose diff touches the bot's paths, once per
labelling. Pushes never start it. To measure a newer commit, remove the label
and add it again. Julian adds the label, or the cloud reviewer does when it
reviews a bot pull request whose other checks are green. Local Claude Code
never adds it; it may suggest it in the PR body.

When the paths changed but a run doesn't measure them, the `changes` job
writes a notice and a line in the job summary: "This pull request changes what
the bot sees. To measure this commit, add the `run-evals` label (or remove it
and add it again)."

Everything else in the earlier decision stands: one run, the pass rate
reported rather than enforced, Julian's own key, the fork guard and the
results artifact.

## Alternatives considered

- **Narrow the paths.** Fewer runs for dependency bumps and UI changes, but
  `site.ts` and others feed the prompt, so any list short enough to save money
  misses changes that move the answers. It also does nothing for the repeat
  runs on doc fixes and merges.
- **A manual `workflow_dispatch` run.** It runs on the branch, not on the
  pull request's merge commit with `main`, and starts from the Actions tab
  instead of the pull request.
- **A comment command, such as `/run-evals`.** It needs an `issue_comment`
  workflow, which runs from `main` with the repo's secrets. Anyone can comment
  on a public repo, so it would need its own guard on who asked. Only someone
  with triage or write access can add a label.

## Consequences

- A bot pull request costs about $0.70 per labelling instead of per push.
- A bot change can merge unmeasured if nobody adds the label. The notice on
  every unmeasured run is the guard against that.
- `labeled` is a new trigger, and every other job runs on it too. Each run
  attaches its check runs to the pull request's head, and the newest one per
  check name is what the pull request shows. If those jobs skipped on a
  labelling, a skipped result would cover a real one, and a failure would show
  as passing. They are free, so they run again.
- The concurrency group is per ref, so a push while the evals run cancels them.
  That run would have measured a stale commit, so the label goes off and back
  on for the new head.
