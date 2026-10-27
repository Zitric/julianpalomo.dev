---
paths:
  - ".github/workflows/**"
---

# CI

`.github/workflows/ci.yml` runs on every pull request to `main`, with
`permissions: contents: read` and one concurrency group per ref that cancels
older runs.

## Jobs

- `check`: `pnpm check` (Biome, then `tsc`).
- `unit`: `pnpm test`.
- `knip`: `pnpm knip`.
- `e2e`: installs Chromium, runs `pnpm test:e2e`, uploads the Playwright report on failure.

The hook tests in `.claude/hooks/tests/` don't run in CI (`docs/tech-debt.md`).

## No deploy job

Deploys don't run in GitHub Actions: Cloudflare Workers Builds deploys `main`
and uploads a preview for every other branch
(`docs/adr/2026-10-27-deploy-with-workers-builds.md`). Don't add a deploy job
or Cloudflare secrets to a workflow; that is a new decision.

## Conventions

- **Every job sets up the same way**: checkout, `pnpm/action-setup` (pnpm from `packageManager` in `package.json`), `actions/setup-node` with `node-version-file: .node-version` and `cache: pnpm`, then `pnpm install --frozen-lockfile`. A new job copies that block.
- **Third-party actions are pinned to a full commit SHA** with the version in a trailing comment (`# v7.0.1`). Never a tag or branch.
- Every job has a `timeout-minutes`.
- CI runs the same `package.json` scripts as a local machine. If a check needs a new command, add a script and call it from both.

If `ci.yml` changes shape, update this rule.
