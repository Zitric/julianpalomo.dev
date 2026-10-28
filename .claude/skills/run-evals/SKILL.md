---
name: run-evals
description: Run the julianpalomo.dev evals (one case, the calibration or the full set), read the failures, and propose a fix in the prompt, the tools or the settings with a run that proves it. Use when a change touches the bot, the claims or evals/, when /handoff calls it, or when an eval run or the CI eval job failed.
---

# Run the evals

The evals ask the real assistant every case and have a judge grade each
answer. `.claude/rules/evals.md` holds the rules; `docs/evals.md` explains a
run and keeps every baseline. Every run calls the real models and costs money.

## 1. When

A change that touches any of these needs one full run:

- `src/lib/bot/**`, `src/lib/claims.ts`, `src/content/claims.json`
- `src/lib/claim-id.ts` (citation ids) and `src/lib/site.ts` (the name and links in the prompt)
- `evals/**`, `vitest.evals.config.ts`
- `package.json`, `pnpm-lock.yaml` (an `ai` upgrade can change answers)

CI's `changes` job and `.claude/rules/evals.md` list the same paths: keep the
three in step. A new file the bot or `evals/` imports from `src/` joins all three.

## 2. Run

| Command                             | When                                   | Cost, roughly |
| ----------------------------------- | -------------------------------------- | ------------- |
| `pnpm eval -t <case-id>`            | While fixing one case                  | $0.10         |
| `EVAL_CALIBRATION_ONLY=1 pnpm eval` | After changing the judge, three times  | $0.09         |
| `pnpm eval`                         | Once before `/handoff`, and as a proof | $0.70         |

The key comes from `.dev.vars`; a worktree without one can't run them, so ask
Julian to copy it. These need no permission. Anything more, such as
`EVAL_REPEAT` above 1, needs Julian's OK, unless the issue sets an eval budget:
then spend up to it without asking. Note each run's cost from its last lines.

## 3. Read

- The report ends with the result and its reasons. Each run above it is
  `PASS`, `FAIL` (with the failed checks and the answer) or `PERR`.
- The full record of each run is in the newest `evals/results/<timestamp>.json`:
  `records[].checks`, and `records[].judge` with each sentence, its verdict and
  a one-line reason. For a CI run, download the `eval-results` artifact.

## 4. Sort each failure

- **The bot**: a check or a judged sentence failed (`overstated`,
  `unsupported`, the wrong language, a rubric). Fix the prompt
  (`src/lib/bot/prompt.ts`), the tools or the settings. A fix is a general
  rule, never a case's answer.
- **The judge**: a `judge-error`, or a wrong calibration item. Fix
  `evals/judge-prompt.ts`, never the item, and run the calibration alone
  three times.
- **The provider**: `PERR` or `INCONCLUSIVE`. Nothing to fix in the bot. Run
  it again once the provider recovers; credit and the key are Julian's.

A failure the bot can't fix without changing a case, a check, a threshold or a
claim goes to Julian, with the answer and the judge's reason.

## 5. Prove the fix

1. Commit the change first, so a recorded run names a commit.
2. Run the failing case alone to see the fix work, then one full run. A case
   that passes once may still fail on the next run: look at what changed in
   the answer, not only the result.
3. Add a row to `docs/evals.md` when the prompt, the model or its settings
   changed. Add rows; never edit one.

## The rules, every time

- **Never weaken a case, a check, a calibration item or a threshold to make a
  run pass.** Changing one needs Julian's OK in the PR.
- **Never touch `src/content/claims.json`.** Only Julian changes claims.
- **Report each run's cost** (bot, judge, calibration) in the PR, and the total.
- The key is never printed, logged or committed.

If `evals/` or the CI job changes shape, update this skill.
