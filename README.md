# julianpalomo.dev

Hi! This is the source code of my personal website. It's a work in progress.

The idea is a small site with an AI assistant you can ask about my experience.
The twist: it should only answer from facts I've verified myself, show where
each answer comes from, and say "I don't know" when it doesn't.

## Status

There is an app skeleton and nothing more: a single placeholder page with my
name and "Coming soon". It is a TanStack Start app (React, TypeScript in strict
mode, Tailwind CSS) set up to run on Cloudflare Workers, but it isn't deployed
yet. There is no assistant and no design.

What exists around it:

- Biome for lint and format, `tsc` for types, knip for unused code and
  dependencies
- Vitest for unit tests and Playwright for a smoke test of the home page
- lefthook, which runs Biome on staged files before each commit
- GitHub Actions, which run the checks, the unit tests, knip and the smoke test
  on every pull request to `main`

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
| `pnpm test:e2e` | Builds, serves and runs the Playwright smoke test in Chromium.                |
| `pnpm knip`     | Reports unused files, exports and dependencies.                               |

The first time you run `pnpm test:e2e`, install the browser with
`pnpm exec playwright install chromium`. To fix formatting yourself, run
`pnpm exec biome check --write`.

## The plan

These are the intended next steps, not a description of something that exists:

- Instructions and tooling for working on the repo with AI agents
- Deploys to Cloudflare, with a preview URL for each pull request
- The Vercel AI SDK with Claude for the assistant

Decisions will be recorded as they're made, one file each, in `docs/adr/`.

## Docs

- [Architecture decision records](docs/adr/README.md): what was decided,
  what else was considered, and why.
- [Tech debt](docs/tech-debt.md): shortcuts taken on purpose, and their status.

## Licence

The code is MIT. My personal content (facts and texts about me, CV documents,
photos) is not licensed for reuse. [`LICENSE`](LICENSE) has the exact split.

## Contact

[LinkedIn](https://www.linkedin.com/in/julianpalomodeonis) ·
[GitHub](https://github.com/Zitric)
