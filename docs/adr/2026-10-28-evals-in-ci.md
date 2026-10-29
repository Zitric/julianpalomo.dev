# Evals in CI, with the pass rate reported, not enforced

Partly superseded by [`2026-10-29-evals-on-a-label.md`](2026-10-29-evals-on-a-label.md): the evals run on a label, not on every push.

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

The evals ([`docs/evals.md`](../evals.md)) are what stand behind "no change to
the prompt, the tools, the model or its settings merges without a full eval
run". A rule nobody has to remember holds better, so Julian decided on 27
October that CI runs them on every pull request that touches the bot.

A run passes when every critical case passes every run, the judge gets every
calibration item right, the cost cap stops nothing, and at least 90% of all
runs pass. A provider error makes it inconclusive. The current baseline, run 12
on Claude Sonnet 5.5, passes at exactly 90% (72 of 80) with two repeats. CI runs
each case once, 40 answers, to keep the cost of a pull request near $0.70. At
that size one answer moves the rate by 2.5 points, so a bot whose real rate is
90% lands on either side of the threshold from noise alone.

## Decision

Julian's decision: the `evals` job in `.github/workflows/ci.yml` runs
`pnpm eval` once, with its own Anthropic key, `EVALS_ANTHROPIC_API_KEY`, which
only Julian holds. It fails on a critical failure, a wrong calibration item, a
provider error or the cost cap. A pass rate below 90% is reported as a warning
in the job summary, not enforced: the job sets `EVAL_PASS_RATE=reported`.
`pnpm eval` on a local machine keeps enforcing it, and `PASS_RATE` doesn't
change.

## Alternatives considered

- **Enforce the 90% in CI as well.** About every other bot pull request would
  fail without anything getting worse, and a check that fails at random gets
  re-run until it passes, which teaches nobody anything.
- **Win margin on the baseline first, then enforce it.** Three of the eight
  failures in run 12 are Markdown lists, and whether the chat renders simple
  lists is still open (#53). That would hold this job back for a change that
  may not come.
- **Run each case twice in CI.** Doubles the cost of every bot pull request,
  and two repeats still put the baseline at the threshold.

## Consequences

- The critical cases, which are the ones that protect Julian, block a pull
  request on every run. A slow slide in the overall rate doesn't: someone has
  to read the warning. The full runs recorded in `docs/evals.md` still enforce
  it.
- An Anthropic outage makes the run inconclusive and fails the job. As a
  required check it would block every bot pull request until re-run, so it
  waits a few runs, to see how often that happens, before becoming one.
- Every bot pull request spends about $0.70 per push on Julian's CI key, and
  pull requests from forks get no secrets, so their job says so and skips.
- Once the baseline has margin, enforcing the rate in CI is a new decision and
  a new ADR.
