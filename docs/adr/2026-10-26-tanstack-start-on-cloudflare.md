# TanStack Start on Cloudflare

- **Status:** Accepted
- **Date:** 2026-10-26

## Context

The site needs a few pages and one piece of server code: the chat endpoint
that talks to the model. That endpoint holds the Anthropic API key, so it must
run on a server, never in the browser. It also needs somewhere durable to keep
rate limits, because limits kept in memory reset every time a serverless
instance restarts.

I already run Form:at on TanStack Start and Cloudflare, with D1 as its
database.

## Decision

Build the site with **TanStack Start and React**, deployed to **Cloudflare
Workers**, following Cloudflare's own TanStack Start guide. The chat endpoint
is a server route in the same app. Rate limits and analytics events live in
**D1**.

How the deploy is wired (Cloudflare's Git integration or a GitHub Actions
workflow) is a separate decision, recorded when it's made.

## Alternatives considered

- **A Vite single-page app plus a Vercel function**, as in the reference
  project. It works well, but it splits the app into two pieces with two
  deploy targets, and it's a stack I don't use day to day.
- **Vite with React Router.** A good option for a pure client app. TanStack
  Start adds server routes and server rendering in one framework, which this
  site needs for the chat endpoint and for pages that load fast on a phone.

## Consequences

- One framework and one deploy for pages and API.
- The API key stays server-side, as a Cloudflare secret.
- Rate limits survive restarts.
- TanStack Start moves quickly, so upgrades need reading the release notes
  rather than trusting older examples.
