---
paths:
  - ".github/workflows/**"
---

# CI

`.github/workflows/ci.yml` runs on every pull request to `main`, with
`permissions: contents: read` and one concurrency group per ref that cancels
older runs, the eval job included, so a new push stops a running eval from
spending more.

## Jobs

- `check`: `pnpm check` (Biome, then `tsc`).
- `unit`: `pnpm test`.
- `knip`: `pnpm knip`.
- `e2e`: installs Chromium, runs `pnpm test:e2e`, uploads the Playwright report on failure.
- `changes`: `git diff` between the merge commit and its first parent, over the paths the evals measure. Outputs `bot`.
- `evals`: runs only when `changes` says `bot`; otherwise it shows as skipped, which counts as Success for a required check. `pnpm eval` once, on the `EVALS_ANTHROPIC_API_KEY` secret, with the pass rate reported, not enforced. Uploads `evals/results/` and writes the summary to the job's page. `.claude/rules/evals.md` has the rest.

**The paths list lives in three places**: the `changes` job, the skill `.claude/skills/run-evals/SKILL.md` and `.claude/rules/evals.md`. Keep them in step.

**Never use `pull_request_target`**: it gives a fork's code the repo's secrets. Under `pull_request` a fork gets none, and the `evals` job says so and passes.

The hook tests in `.claude/hooks/tests/` don't run in CI (`docs/tech-debt.md`).

## No deploy job

Deploys don't run in GitHub Actions: Cloudflare Workers Builds deploys `main`
and uploads a preview for every other branch
(`docs/adr/2026-10-27-deploy-with-workers-builds.md`). Don't add a deploy job
or Cloudflare secrets to a workflow; that is a new decision.

## Conventions

- **Every job sets up the same way**: checkout, `pnpm/action-setup` (pnpm from `packageManager` in `package.json`), `actions/setup-node` with `node-version-file: .node-version` and `cache: pnpm`, then `pnpm install --frozen-lockfile`. A new job copies that block. The one exception is `changes`, which runs only git.
- **Third-party actions are pinned to a full commit SHA** with the version in a trailing comment (`# v7.0.1`). Never a tag or branch.
- Every job has a `timeout-minutes`.
- CI runs the same `package.json` scripts as a local machine. If a check needs a new command, add a script and call it from both.

If `ci.yml` changes shape, update this rule.
