# A theme choice lasts until Glasgow's next dusk or dawn

- **Status:** Accepted
- **Date:** 2026-10-29

## Context

[The visual direction](2026-10-28-visual-direction.md) made the toggle always
win and stored the choice in a cookie for a year. One press therefore turned
off Glasgow's day and night for good, and nothing offered a way back: Julian
pressed dark one night and still had the dark site the next morning, on his
laptop and his phone.

## Decision

A press sets the other theme until Glasgow's next civil dusk or civil dawn,
the moment its sun next crosses 6° below the horizon. Two minutes after it,
so Glasgow has surely turned, the site follows Glasgow again. Pressing back to Glasgow's current theme ends the
choice at once. The cookie carries its own end (`theme=dark.<epoch ms>`) and
a `Max-Age` up to that moment, so the server and the browser both drop it
then. The old one-year cookies, which have no end, count as no choice, and
the server deletes them.

## Alternatives considered

- **Keep the one-year choice and add a "follow Glasgow" option.** Another
  control for something a visitor would rarely look for; the forgotten choice
  stays the default.
- **A fixed lifetime, such as 12 hours.** It ends at an arbitrary hour, so the
  theme could flip in the middle of an afternoon. Ending at the twilight means
  the end never changes what's on screen: Glasgow has just come round to the
  chosen theme.
- **A session cookie.** It ends when the browser closes, which on a phone may
  be never, and doesn't follow the day.

## Consequences

- A visitor who wants dark by day presses the toggle each day. That's the
  point: the site's default is Glasgow's real day and night.
- `src/lib/twilight.ts`'s `nextTwilight` is now the one place that answers
  "when does this choice end", for the cookie and the minute clock alike.
