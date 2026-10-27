# julianpalomo.dev

Hi! This is the source code of my personal website. It's a work in progress.

The idea is a small site with an AI assistant you can ask about my experience.
The twist: it should only answer from facts I've verified myself, show where
each answer comes from, and say "I don't know" when it doesn't.

## Status

There is an app skeleton: a single placeholder page with my name and "Coming
soon". It is a TanStack Start app (React, TypeScript in strict mode, Tailwind
CSS) that runs on Cloudflare Workers at
[julianpalomo.dev](https://julianpalomo.dev). There is no design yet.

The assistant has its server side but no chat on the page: an endpoint,
`POST /api/chat`, streams an answer from Claude (Haiku 5.5, through the Vercel
AI SDK), which can only look up the facts I've confirmed. Without an Anthropic
API key it answers "not available", which is what previews and the live site
do for now.

What exists around it:

- Biome for lint and format, `tsc` for types, knip for unused code and
  dependencies
- A data file with those facts (claims), a Zod schema that validates it, and a
  filter that hands out only the facts I've confirmed
- The chat endpoint, with three read-only tools that hand the model those
  confirmed facts and nothing else
- Vitest for unit tests, and Playwright for a smoke test of the home page and
  a check that the browser bundle holds no API key or claims data
- lefthook, which runs Biome on staged files before each commit
- GitHub Actions, which run the checks, the unit tests, knip and the
  Playwright tests on every pull request to `main`
- Cloudflare Workers Builds, which deploys `main` and gives every pull request
  its own preview URL
- Instructions and tooling for AI coding agents: [`AGENTS.md`](AGENTS.md) (also
  read as `CLAUDE.md`, a symlink to it), plus rules, hooks, skills and reviewer
  subagents for Claude Code in [`.claude/`](.claude/README.md)

### Working with Claude Code

The repo is built with Claude Code, and the setup is part of the project:
[`.claude/README.md`](.claude/README.md) explains every piece. If you clone it
and use Claude Code yourself, you can add a `CLAUDE.local.md` at the root for
your own preferences, for example "Talk to me in Spanish. Write everything that
goes into the repo in English." It's gitignored, so it never reaches the repo.

### Running it

You need the Node version in [`.node-version`](.node-version) and pnpm (the
version is pinned in `package.json`). Then:

```sh
pnpm install
pnpm dev
```

| Command         | What it does                                                                  |
| --------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`      | Starts the dev server. Add `--host` to open it from a phone on the same wifi. |
| `pnpm build`    | Builds the app for production into `dist/`.                                   |
| `pnpm preview`  | Serves the last build in the local Workers runtime. Run `pnpm build` first.   |
| `pnpm check`    | Runs Biome (lint and format), then `tsc`.                                     |
| `pnpm test`     | Runs the unit tests once with Vitest.                                         |
| `pnpm test:e2e` | Builds, serves and runs the Playwright tests in Chromium.                     |
| `pnpm knip`     | Reports unused files, exports and dependencies.                               |

To try the assistant locally, copy `.dev.vars.example` to `.dev.vars` (it's
gitignored) and put an Anthropic API key in it. Without one, `/api/chat`
answers "not available".

The first time you run `pnpm test:e2e`, install the browser with
`pnpm exec playwright install chromium`. To fix formatting yourself, run
`pnpm exec biome check --write`.

### Deploys and previews

Cloudflare's Git integration for Workers
([Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/))
builds the repository on every push. Nothing deploys from GitHub Actions, and
no Cloudflare credentials live in GitHub.
[The ADR](docs/adr/2026-10-27-deploy-with-workers-builds.md) explains why.

- **Production:** a merge to `main` runs `wrangler deploy`, which updates
  [julianpalomo.dev](https://julianpalomo.dev). The custom domain is declared
  in [`wrangler.jsonc`](wrangler.jsonc).
- **Previews:** every push to any other branch builds a preview that doesn't
  touch the live site. Cloudflare comments on the pull request with the build
  status and the preview URL, on `workers.dev`, which opens on a phone like any
  other link. Preview URLs are public.

The build settings live in the `julianpalomo-dev` Worker's settings in the
Cloudflare dashboard, not in the repo:

| What                     | Value                                                             |
| ------------------------ | ----------------------------------------------------------------- |
| Production branch        | `main`                                                            |
| Build command            | `pnpm run build`                                                  |
| Deploy command           | `npx wrangler deploy` (Cloudflare's default)                      |
| Builds on other branches | On, with `npx wrangler preview` (Cloudflare's default, open beta) |

The build image reads the Node version from `.node-version` and the pnpm
version from `packageManager` in `package.json`.

## The plan

These are the intended next steps, not a description of something that exists:

- Citations the server checks, so every answer shows which confirmed facts it
  used
- The chat on the home page
- Daily spending limits, per visitor and in total

Each decision is recorded as it's made, one file each, in `docs/adr/`.

## Docs

- [`AGENTS.md`](AGENTS.md): instructions for AI coding agents working on the
  repo.
- [Architecture decision records](docs/adr/README.md): what was decided,
  what else was considered, and why.
- [Tech debt](docs/tech-debt.md): shortcuts taken on purpose, and their status.

## Licence

The code is MIT. My personal content (facts and texts about me, CV documents,
photos) is not licensed for reuse. [`LICENSE`](LICENSE) has the exact split.

## Contact

[LinkedIn](https://www.linkedin.com/in/julianpalomodeonis) ·
[GitHub](https://github.com/Zitric)
