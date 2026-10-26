# A new repository, not a fork

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The idea for this site came from a friend's open-source CV bot: a React app
with a serverless function that lets a language model answer questions about a
CV through tool calls. He gave permission to reuse it however I like.

That project is built on a different stack from mine (Vite, Vercel, npm,
ESLint). My own production work, [Form:at](https://formatglasgow.com), uses
TanStack Start, Cloudflare, pnpm and Biome, with a Claude Code setup I built
for it.

This repository is also part of my portfolio. Whoever opens it should see my
architecture and my decisions.

## Decision

Start a new repository with my own stack. Reuse the reference project's
**ideas**, not its code: tools that return pieces of the CV instead of the
whole thing, showing which tool the assistant is calling, a friendly error with
contact links when the model fails, prompt caching, and end-to-end tests with
a mocked API.

## Alternatives considered

- **Fork it.** Faster to a first version, but almost everything would need
  migrating to my stack, and the repository would open with a "forked from"
  banner above my own work.

## Consequences

- The first version takes a bit longer, because the skeleton is built from
  scratch.
- Every file here is written for this project, so the docs and the Claude Code
  setup can describe it accurately from the first commit.
