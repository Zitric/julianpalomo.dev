# Deploys with Cloudflare Workers Builds

- **Status:** Accepted
- **Date:** 2026-10-27

## Context

The site runs on Cloudflare Workers
([TanStack Start on Cloudflare](2026-10-26-tanstack-start-on-cloudflare.md)).
I need two things from the deploy: a merge to `main` updates
https://julianpalomo.dev, and every pull request gets its own preview URL,
visible from the PR, that I can open on my phone.

Cloudflare offers two ways to do this today:

- **Workers Builds**, its Git integration. A GitHub App builds the repository
  on every push. A push to the production branch runs `wrangler deploy`; a push
  to any other branch runs a preview command that uploads a new version with a
  preview URL, and Cloudflare posts a comment on the pull request with the
  build status and that URL. The build reads the Node version from
  `.node-version` and the pnpm version from `packageManager` in `package.json`.
- **A GitHub Actions workflow** running `wrangler deploy` through
  `cloudflare/wrangler-action`, with an API token and account ID stored as
  GitHub secrets.

Preview URLs live on `workers.dev`
(`<version or alias>-julianpalomo-dev.<subdomain>.workers.dev`), are public by
default, and aren't generated for Workers that implement a Durable Object.

## Decision

Deploy with **Workers Builds**. `main` is the production branch, and preview
builds are on for every other branch. The custom domain is declared in
`wrangler.jsonc` (`routes` with `custom_domain: true`), together with explicit
`workers_dev: true` and `preview_urls: true`, so the repo shows where the site
is served from.

## Alternatives considered

- **A `deploy.yml` workflow in GitHub Actions.** Everything would live in the
  repo, and the deploy could wait for CI to pass. But it needs an API token
  that can edit Workers stored as a GitHub secret, a step of my own to post the
  preview URL on the PR, and pull requests from forks get no secrets, so they
  get no preview. Workers Builds gives all of that with no token in GitHub and
  no workflow to maintain.

## Consequences

- No Cloudflare credentials in GitHub.
- The build and deploy commands are set in the Cloudflare dashboard, not in
  the repo, so the README lists them. A change there isn't reviewed in a PR.
- The deploy doesn't wait for CI: a push to `main` deploys straight away. A
  ruleset on `main` makes that safe: changes reach it only through a pull
  request that passed the four CI checks.
- Adding a Durable Object would stop preview URLs; that needs a new decision.
- Preview URLs are public. Fine for a public site; anything secret on a branch
  would need Cloudflare Access in front of them.
- The `julianpalomo.dev` zone must be in the Cloudflare account before the
  route reaches `main`, or the production deploy fails.
