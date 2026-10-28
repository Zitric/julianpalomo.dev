# The visual direction: a live Highland landscape and a cow

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

Until now the site was plain on purpose: phase 4 built the chat with neutral
tokens and no design. The site is my portfolio as much as my CV, so it should
look like someone made it with care, and it should be mine. I live in Glasgow,
I like green and natural landscapes, and my CV already uses one green,
`#2B6F4A`.

The design was explored on a canvas of mock-ups over several rounds.
[`DESIGN.md`](../../DESIGN.md) records the result in detail; this record keeps
the choices that shape it, and what lost.

## Decision

- **A warm, playful, rounded direction in one green.** Bricolage Grotesque for
  headings and buttons, Inter for text, both self-hosted. The CV's green is
  the only accent, in both themes.
- **The hero is a live illustration of a Highland glen** that follows
  Glasgow: the season from the date, the time of day from the sun's real
  elevation, and the current weather from Open-Meteo, cached on our Worker
  for 30 minutes. A small herd of Highland cows grazes in it. Visitors can
  play with season, time, clouds, rain and wind from a gear panel, and the
  page says when the sky is theirs and not Glasgow's.
- **The theme follows Glasgow's day and night**, wherever the visitor is.
  The toggle always wins and is remembered in a cookie, so the server renders
  the right theme and there's no flash.
- **The assistant is a Highland cow**, not my face. It listens, chews while
  it looks things up, talks while the answer streams and licks its lips when
  it's done.
- **Sounds are on by default**, quiet, through use-sound, with a mute toggle
  that's always visible.
- **Motion respects `prefers-reduced-motion`**: with it, nothing decorative
  moves.
- **The landscape's colours are data, not tokens.** They are computed (mixed
  by the sun's elevation and the season), so they live in the landscape's
  palette module. UI colours stay in `tokens.css`.

## Alternatives considered

- **An editorial direction** (serif, newspaper-like). Elegant, but it didn't
  feel like me.
- **A terminal direction.** I like its colours, but Form:at, my other project,
  is already terminal-styled, and two sites in the same style would blur
  together. Its green survived.
- **My own face as the assistant**, with the half-head that flips open like
  the Canadians in South Park. Funny, but the bot speaks about me in the third
  person and promises never to pretend to be me; a talking version of my face
  would contradict that.
- **A pixel-art cow.** The landscape is flat vector art, so the cow is too;
  my portrait is the only pixel art, which sets it apart as "this is me".
- **The visitor's local time for day and night.** It's what most sites do,
  but the landscape shows Glasgow's live weather, and Glasgow's sky at night
  over a page in daylight would look broken. Glasgow's time keeps the two
  coherent.
- **Josh Comeau's inline head script** for a theme without a flash. It works,
  but it would need the sun calculation in a second, hand-written copy; a
  cookie read by the server needs neither.
- **A cron job for seasons or weather.** Seasons come from the date; the
  weather is fetched on demand and cached, at most about 48 calls a day. A
  Cron Trigger would be one more moving part for the same result.
- **Open-Meteo through the browser.** Every visitor would call Open-Meteo, and
  the 10,000 free daily calls would be at the mercy of traffic. Through our
  Worker it's one call per half hour.
- **A Rive or Lottie animation for the cow.** More expressive, but the
  animations needed are simple, and CSS keyframes on SVG groups do them with
  no runtime.

## Consequences

- The page renders per request with Glasgow's time, which it already did on
  Workers. Server and client must agree on the time used for the first render,
  or hydration will complain.
- `.claude/rules/styling.md` gains one exception: the landscape's palette
  module may hold colours. Everything else keeps the rule.
- Open-Meteo's free tier is for non-commercial use and asks for attribution
  (CC BY 4.0); the footer credits it. If the site ever became commercial,
  this needs revisiting.
- use-sound describes itself as semi-maintained. If it breaks with a future
  React, a small hook on the Web Audio API can replace it without changing
  the design.
- The design adds a lot of motion. The reduced-motion rules, pausing when the
  tab is hidden and animating only `transform` and `opacity` keep it cheap and
  optional; each issue checks them.
