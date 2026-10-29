# julianpalomo.dev

Hi! This is the source code of my personal website. It's a work in progress.

The idea is a small site with an AI assistant you can ask about my experience.
The twist: it should only answer from facts I've verified myself, show where
each answer comes from, and say "I don't know" when it doesn't.

## Status

The home page has my pixel-art portrait, my name, my role and a chat with the
assistant. It is a TanStack Start app (React, TypeScript in strict mode,
Tailwind CSS) that runs on Cloudflare Workers at
[julianpalomo.dev](https://julianpalomo.dev). [`DESIGN.md`](DESIGN.md)
describes the visual design, which is being built in steps: the colours, the
fonts, the layout and the assistant are in, and the theme follows day and
night in Glasgow unless the visitor picks one with the toggle. The hero is a
live Highland glen: its season follows the date and its sky the sun's real
height over Glasgow, a small herd grazes, and the sun sets when the visitor
switches to the dark theme. Glasgow's live weather rolls into it: clouds,
rain, snow, wind and haar, with leaves, petals, midges or frost by season, and
a chip with the time and the temperature. A gear lets visitors play with
the sky on their own screen (season, time of day, clouds, rain or snow, wind
and haar) until they go back to live Glasgow. The assistant is a
Highland cow that greets you and follows the chat: it listens while you type,
chews while it looks things up, talks while the answer streams, licks its lips
when it's done and lowers its head when something goes wrong. The site is in
English at `/` and Spanish at `/es`: visitors in Spain get Spanish by default,
everyone else English, and the language toggle always wins.

The weather comes from [Open-Meteo](https://open-meteo.com/) through our
Worker, at `GET /api/weather`, so the visitor's IP never reaches Open-Meteo.
The Worker keeps each answer for 30 minutes (5 after a failure), so the site
calls Open-Meteo at most about 48 times a day per Cloudflare data centre, and
needs no key and no cron. The page fetches it after it loads and keeps a clear
sky when it fails. The footer credits Open-Meteo, as its CC BY 4.0 terms ask.

You ask a question and the answer streams in from Claude (Sonnet 5.5, through
the Vercel AI SDK), which can only look up the facts I've confirmed. Each fact
an answer cites shows as a source chip, such as "CV · Cazoo · Redux →
Zustand", and a citation only counts if the model looked that fact up while
answering. Every question goes through two daily limits kept in Cloudflare
D1: 30 questions per visitor, and about $1 of model spend across everyone.
Visitors are counted by a hash that changes every day, never by their IP.
The live site has its API key and its limits in place, so the chat answers on
[julianpalomo.dev](https://julianpalomo.dev); without a key it says it isn't
available.

What exists around it:

- Biome for lint and format, `tsc` for types, knip for unused code and
  dependencies
- A data file with those facts (claims), a Zod schema that validates it, and a
  filter that hands out only the facts I've confirmed
- The chat endpoint, with three read-only tools that hand the model those
  confirmed facts and nothing else, the daily limits in D1, and a demo mode
  for previews and tests
- Vitest for unit tests, and Playwright for the home page, the chat (in demo
  mode) and a check that the browser bundle holds no API key or claims data
- Evals: questions asked to the real assistant through the same code as the
  chat, with code checks and a second model that judges every answer sentence
  by sentence, calibrated before each run, and a score and a cost per run
- lefthook, which runs Biome on staged files before each commit
- GitHub Actions, which run the checks, the unit tests, knip and the
  Playwright tests on every pull request to `main`, and the evals on every
  pull request that touches the assistant, its claims or the evals
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

| Command                 | What it does                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`              | Starts the dev server. Add `--host` to open it from a phone on the same wifi.                                                                               |
| `pnpm build`            | Builds the app for production into `dist/`.                                                                                                                 |
| `pnpm preview`          | Serves the last build in the local Workers runtime. Run `pnpm build` first.                                                                                 |
| `pnpm check`            | Runs Biome (lint and format), then `tsc`.                                                                                                                   |
| `pnpm test`             | Runs the unit tests once with Vitest.                                                                                                                       |
| `pnpm test:e2e`         | Builds, serves and runs the Playwright tests in Chromium.                                                                                                   |
| `pnpm eval`             | Asks the real assistant the eval cases and has a second model judge the answers. Costs money: about $0.09, then $0.01–0.02 a case. `-t <case-id>` runs one. |
| `pnpm knip`             | Reports unused files, exports and dependencies.                                                                                                             |
| `pnpm db:migrate:local` | Applies the D1 migrations to the local database in `.wrangler/state`.                                                                                       |

To try the assistant locally, copy `.dev.vars.example` to `.dev.vars` (it's
gitignored), put an Anthropic API key in it, and set `VISITOR_SALT` to any long
random string (the salt for the visitor hash). Then run `pnpm db:migrate:local`
once to create the tables in the local D1. With a key but no salt, `/api/chat`
answers "not available", so the model is never called without its limits.
Without a key it answers "not available" too; with `BOT_DEMO=1` instead of a
key, it answers in demo mode, as on previews. `pnpm test:e2e` never uses your key: it builds with
`wrangler.jsonc`'s `e2e` environment, which loads no secrets and runs in demo
mode.

`pnpm eval` reads the API key from `.dev.vars` too, asks the assistant every
case in [`evals/`](evals/) through the same code as `/api/chat`, checks each
answer in code (citations, links, no contact details, no Markdown), and then
has a second model, Claude Sonnet 5.5, judge every answer sentence by
sentence against the claims it used: a sentence that says more than its claim
("managed" where the claim says "technical lead") fails the case. Before any
case, the judge must get a set of calibration answers right, or the run stops.
The report gives the score and the estimated cost. Results also go to
`evals/results/`, which is gitignored. `EVAL_REPEAT=2 pnpm eval` asks each case
twice, as a baseline does. A run passes when every critical case passes every
time and at least 90% of all runs pass; it stops at $2 of estimated cost. A
run in which the model API failed (no credit, a bad key, a rate limit, an
overload) is inconclusive, neither a pass nor a failure of the bot.
[`docs/evals.md`](docs/evals.md) has every baseline so far.

CI runs `pnpm eval` once on every pull request that changes the assistant's
code, the claims, the evals or the dependencies, on a separate API key, and
writes the score, the critical failures and the cost to the job's summary.
There a pass rate below 90% is a warning, not a failure: one run of 40 answers
is too small to tell a real drop from noise. Every other reason still fails
the job.

The first time you run `pnpm test:e2e`, install the browser with
`pnpm exec playwright install chromium`. It serves its own build on port 4173
and stops at once if something else is already there, such as a `pnpm preview`
or another worktree's run, so it never tests a build it didn't make. To fix
formatting yourself, run
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
  other link. Preview URLs are public. Previews have no API key, so the chat
  there answers in demo mode: a scripted answer that says it's a demo and
  quotes one confirmed fact, without calling the model.

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

The next steps are tracked as
[GitHub issues](https://github.com/Zitric/julianpalomo.dev/issues), one per
piece of work.

Each decision is recorded as it's made, one file each, in `docs/adr/`.

## Docs

- [`AGENTS.md`](AGENTS.md): instructions for AI coding agents working on the
  repo.
- [How a question is answered](docs/architecture.md): the path of one question
  through the limits, the model, its tools and the citation check.
- [`DESIGN.md`](DESIGN.md): how the site looks, moves and sounds: colours,
  type, the live Highland landscape, the cow and the chat.
- [Evals](docs/evals.md): how the assistant is tested against its claims,
  and the score of every baseline.
- [Architecture decision records](docs/adr/README.md): what was decided,
  what else was considered, and why.
- [Tech debt](docs/tech-debt.md): shortcuts taken on purpose, and their status.

## Licence

The code is MIT. My personal content (facts and texts about me, CV documents,
photos) is not licensed for reuse. [`LICENSE`](LICENSE) has the exact split.

## Contact

[LinkedIn](https://www.linkedin.com/in/julianpalomodeonis) ·
[GitHub](https://github.com/Zitric)
