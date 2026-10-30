# DESIGN.md

How julianpalomo.dev looks, moves and sounds. It is the spec for the visual
design: every issue in the visual-design epic builds a piece of it, and a
change to the design starts here, before any code.

The design was explored on a private canvas of mock-ups. This file and the
reference files in [`docs/design/`](docs/design/) are what survived it, and
they are the source of truth. The decision record is
[`docs/adr/2026-10-28-visual-direction.md`](docs/adr/2026-10-28-visual-direction.md).

**Status:** agreed with Julian on 28 October 2026. Until the epic's issues are
closed, the live site shows only the parts already built.

## Contents

1. [Principles](#1-principles)
2. [Colour](#2-colour)
3. [Type](#3-type)
4. [Shape and spacing](#4-shape-and-spacing)
5. [Layout](#5-layout)
6. [Theme: Glasgow's day and night](#6-theme-glasgows-day-and-night)
7. [The landscape](#7-the-landscape)
8. [Play with the sky](#8-play-with-the-sky)
9. [The assistant](#9-the-assistant)
10. [The chat](#10-the-chat)
11. [Motion](#11-motion)
12. [Sound](#12-sound)
13. [The portrait](#13-the-portrait)
14. [CV and contact](#14-cv-and-contact)
15. [Accessibility](#15-accessibility)
16. [Reference files](#16-reference-files)
17. [Not in this design](#17-not-in-this-design)

## 1. Principles

- **Warm and playful, never in the way.** The landscape, the cow and the
  sounds are there to make people smile. The content (who Julian is, the chat,
  the CV) always comes first and loads first. On a first visit an entrance
  introduces the page in order (who Julian is, the glen, the cow, then the
  chat), and any tap, key or scroll ends it at once; later visits that week
  get a short version, about 2s, with the chat fading in at once. With
  reduced motion the content shows at once (section 11).
- **Alive, and true.** The landscape is Glasgow's real season, time and
  weather. When a visitor plays with it, the page says so ("Your sky"), so
  nobody thinks it's snowing in Glasgow in August.
- **Mobile first.** Every layout starts at 375px wide and works down to 320px
  with no horizontal scroll. Desktop is a wider arrangement of the same parts,
  not a different site.
- **One accent.** The green of Julian's CV, `#2B6F4A`, is the only accent.
  Seasons change the landscape and its particles, never the UI colours, so the
  site looks like itself in January and in July.
- **Motion and sound are optional extras.** With `prefers-reduced-motion`,
  nothing moves that doesn't have to (section 11). With sound muted, nothing
  is lost (section 12). Nothing is ever conveyed by animation or sound alone.
- **Flat.** Flat fills, no drop shadows on buttons, rounded shapes. The only
  shadows are on things that float: the gear panel and dialogs.

## 2. Colour

### UI tokens

All UI colours are tokens in `src/styles/tokens.css`, defined for light and
dark as `.claude/rules/styling.md` says. The existing token names stay; these
are their values and the new ones.

| Token                                                  | Light                                      | Dark                  | Used for                                                     |
| ------------------------------------------------------ | ------------------------------------------ | --------------------- | ------------------------------------------------------------ |
| `background`                                           | `#F6F8F3`                                  | `#0E1511`             | Page                                                         |
| `foreground`                                           | `#13201A`                                  | `#E8EFE9`             | Text                                                         |
| `muted`                                                | `#4F5E55`                                  | `#9EB0A4`             | Secondary text, hints, labels                                |
| `border`                                               | `#DCE5DA`                                  | `#24332A`             | Chip borders, dividers                                       |
| `accent`                                               | `#2B6F4A`                                  | `#7FCB98`             | Buttons, links, citation numbers, focus ring                 |
| `on-accent`                                            | `#FFFFFF`                                  | `#0E1511`             | Text and icons on `accent`                                   |
| `tint`                                                 | `#E6F0E6`                                  | `#18241D`             | Assistant bubbles, status pill, icon buttons in the bar      |
| `field`                                                | `#FFFFFF`                                  | `#121B16`             | The composer and form fields                                 |
| `field-border`                                         | `#7F9184`                                  | `#587060`             | The border of the composer and form fields (3:1 on the page) |
| `user`                                                 | `#2B6F4A`                                  | `#2B6F4A`             | The visitor's bubbles (the same green in both themes)        |
| `on-user`                                              | `#FFFFFF`                                  | `#FFFFFF`             | Text on `user`                                               |
| `glass`                                                | `rgb(246 248 243 / 86%)`                   | `rgb(14 21 17 / 80%)` | Chips and buttons that sit on the landscape, with a 6px blur |
| `danger`                                               | `#B7191C`                                  | `#FD7468`             | Only for a broken field in the contact form                  |
| `live`                                                 | `#E5484D`                                  | `#E5484D`             | The small "live" dot in "Back to live Glasgow"               |
| `track-night`, `track-dawn`, `track-day`, `track-dusk` | `#0E1A24`, `#F5C49A`, `#CFE4EC`, `#A9B7CF` | The same              | The time-of-day slider's track, night to night (section 8)   |
| `track-clear`, `track-overcast`                        | `#CFE4EC`, `#8A969C`                       | The same              | The clouds slider's track                                    |
| `track-dry`, `track-wet`                               | `#E6EEF0`, `#2E4A6B`                       | The same              | The rain slider's track                                      |
| `track-calm`, `track-gale`                             | `#E6F0E6`, `#2B6F4A`                       | The same              | The wind slider's track                                      |

The values were picked by eye on the canvas, then measured:
`tests/unit/tokens.test.ts` reads `tokens.css` and checks every text pair
against WCAG AA (4.5:1 for text, 3:1 for UI parts) in both themes. Where a
pair fails, the value changes, not the rule. `border` is too faint to outline
a field (1.2:1 on the page), so fields have their own `field-border`, and
`border` stays for dividers and chips. `danger` is the colour it already had,
written in hex. `tokens.css` uses hex, so it reads the same as this table and
the test needs no colour conversion.

### The landscape's palette

The landscape is an illustration whose colours are computed: the sky mixes
between five moments of the day, and the land between day and night for each
season (section 7). Those colours can't be static tokens, so they are data in
the landscape's palette module (`src/lib/scene/palette.ts`), taken from
[`docs/design/landscape-palettes.json`](docs/design/landscape-palettes.json).
The same goes for the two cows' colours, which are part of their artwork.

This is the one exception to "colours live only in `tokens.css`", recorded
in `.claude/rules/styling.md`. UI components still never use a colour literal.

## 3. Type

| Role                    | Font                | Weight  | Size (mobile / desktop)  | Notes                    |
| ----------------------- | ------------------- | ------- | ------------------------ | ------------------------ |
| Name (`h1`)             | Bricolage Grotesque | 800     | 34px / 44px              | Letter spacing `-0.02em` |
| Role under the name     | Bricolage Grotesque | 700     | 18px / 20px              | In `accent`              |
| Name in the compact bar | Bricolage Grotesque | 800     | 18px                     |                          |
| Panel and dialog titles | Bricolage Grotesque | 700     | 20px                     |                          |
| Buttons with text       | Bricolage Grotesque | 700     | 15px                     |                          |
| Body and chat messages  | Inter               | 400     | 15.5px, line height 1.55 |                          |
| Chips, suggestions      | Inter               | 500     | 13–14px                  |                          |
| Hints, labels, captions | Inter               | 500–600 | 12–12.5px                | Labels in `muted`        |
- Both fonts are OFL-1.1 and self-hosted from Fontsource's variable packages
  (`@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/inter`),
  never from Google Fonts, so no visitor's IP goes to Google and there's no
  third-party request on the critical path.
- Only the Latin subsets load (English and Spanish need nothing else), with
  `font-display: swap`. The two files the first screen needs are preloaded.
- Form fields are at least 16px, so iOS doesn't zoom in on focus.

## 4. Shape and spacing

- **Radii:** buttons, chips and pills are fully round (`999px`); the composer
  `24px`; chat bubbles `20px` with the corner nearest the speaker at `6px`;
  cards and panels `20px`; the portrait `26px` on mobile and `32px` on desktop.
- **Speech bubbles** outside the chat (the cow's "Moo!", the gear's hint and
  the hero's hello on a phone) have a comic-style tail pointing at whoever
  speaks, in the bubble's `field` fill and 1.5px `border`, with no seam where
  it joins. Chat bubbles keep their 6px corner instead, with no tail.
- **Spacing:** a 4px scale (Tailwind's default). The page gutter is 16px on
  mobile and 24px from `sm` up.
- **Touch targets:** at least 44 × 44px on mobile, including icon buttons.
- **Borders:** 1.5–2px, in `border` for chips and dividers and in
  `field-border` for fields; a focused field's border turns `accent`, with a
  4px glow of `accent` at 22% opacity.
- **Buttons:** flat. The primary button is `accent` on `on-accent`; it
  brightens slightly on hover and, when pressed, scales to `0.92` (round icon
  buttons such as Send) or `0.97` (wide buttons such as "Back to live
  Glasgow") for 80ms. Secondary buttons are `border`-outlined pills
  ("Download CV", "Contact"). Never a 3D edge or a drop shadow.

## 5. Layout

### Mobile (from 320px)

From top to bottom:

1. **The hero** (230px tall): the landscape fills it edge to edge. On top of
   it, a row of controls 12px from the edges:
   - left: the gear (section 8), 44px round in `accent`, and the weather chip
     ("9°C · Drizzle", in `glass`);
   - right: the language toggle ("ES" / "EN"), the sound toggle and the theme
     toggle, 44px round buttons in `glass`, the size of every icon button on the site.
2. **The portrait** (96 × 120px), overlapping the hero's bottom edge by half
   its height, 20px from the left, with a 4px ring in `background`.
3. **Name, role and one line** ("Ask about my experience. Answers come only
   from facts I've confirmed, with their sources."), then **"Download CV"**
   and **"Contact"**.
4. **The chat** (section 10). At its top, the cow (100 × 79px on a phone) rests
   its chin on the chat's edge, like a fence, with its two front hooves over it:
   on a phone the edge is a 3px line in `border` with rounded ends, across
   the top of the chat. Beside the cow, bottom-aligned, "Ask me about Julian"
   (Bricolage, 16px, `foreground`) over "Ready when you are" (13px, `muted`).
   Under the edge, the greeting, three suggested questions and the composer.
   The answers have no cow of their own, so their bubbles get the full width.

Once the visitor sends a first question, the page scrolls so the chat fills
the screen, with the cow on its edge just under the bar (the chat is at least a
screen tall from then on, so there's always room to scroll it up), and a
**compact bar** sticks to the top: the square portrait at
34px, the name, and the sound and theme toggles, 58px tall, with a thin strip
of hills along its bottom edge. The composer stays fixed at the bottom, above
the on-screen keyboard.

### Desktop (from 1024px)

- **The hero** is 300–320px tall and spans the full width; the content below
  is centred, at most 1120px wide. On wider screens the landscape stretches
  and the slice shows more of it (a distant cow on the right hill, for
  example).
- **Two columns** under the hero: on the left (about 300px) the portrait at
  120 × 150px overlapping the hero, the name, the role, the line and the two
  buttons; on the right, the chat in a card with a 2px `border` and a 20px
  radius. The card's top border is the cow's edge: the cow sits on it, 28px
  from its left edge, overlapping it from above, with the heading beside it,
  so the card starts about 7.5rem lower to make room.
- The gear's panel opens as a popover under the gear (section 8).

### Between the two

From 640px the mobile layout gets wider gutters and a larger name; the two
columns start at 1024px. Nothing is hidden at any width except the distant
parts of the landscape that the slice crops.

### Two languages

`/` is English and `/es` is Spanish, the same page in each. Visitors in Spain
get Spanish by default and everyone else English; the "ES" / "EN" toggle
always wins and is remembered, and a link to `/es` is always Spanish. Spanish
usually runs longer than English, so every text box is checked in both
languages at 320px.

## 6. Theme: Glasgow's day and night

The site has two themes, light and dark, and by default it follows **day and
night in Glasgow**, wherever the visitor is.

- **Night** runs from civil dusk to civil dawn in Glasgow (55.8642° N,
  4.2518° W): from when the sun is 6° below the horizon in the evening until
  it's 6° below in the morning. Sunrise, sunset and the sun's elevation are
  computed in code with the NOAA solar equations. There is no API call and no
  dependency.
- **The toggle wins until Glasgow's next dusk or dawn.** Pressing it sets
  the other theme until Glasgow's next civil dusk or civil dawn, when the sun
  next crosses 6° below the horizon. Two minutes later, so Glasgow has
  surely turned, the choice ends and the site follows Glasgow again.
  Pressing it back to Glasgow's current theme ends the choice at once, so
  two presses in a row return to following Glasgow. At
  23:00, pressing light lasts until dawn, when Glasgow is light anyway; at
  14:00, pressing dark lasts until dusk. Either way, the next evening or
  morning follows Glasgow.
- **No flash, without a head script.** The choice is stored in a cookie
  that carries its end, `theme=dark.<epoch ms>`, with a `Max-Age` up to that
  moment. The server renders `<html data-theme>` from a choice that hasn't
  ended, or from Glasgow's sun at the time of the request, so the first paint
  is already right and there's no inline script to keep in step with the
  TypeScript. A cookie whose end has passed, or an old one-year `theme=dark`
  without an end, is no choice, and the server deletes it.
- **While the page is open**, the client re-checks every minute and ends a
  choice whose end has passed. When the theme follows Glasgow and its dusk
  or dawn arrives, the theme changes by itself with the same choreography as
  the toggle, but slower (about 6s), so it doesn't startle. A choice ends
  just as Glasgow comes round to the same theme, so its end changes nothing
  on screen.
- **The landscape matches the theme.** Normally it shows Glasgow's real time.
  If the chosen theme disagrees with it (dark during Glasgow's day, or light
  at night), the landscape shows a representative moment instead: today's
  solar noon for light, that night's solar midnight for dark.

### The toggle's choreography

Going from light to dark is a 1.7s sunset; dark to light is the same in
reverse, a sunrise.

| What                                                              | From (s) | To (s) |
| ----------------------------------------------------------------- | -------- | ------ |
| UI colours (background, text, buttons)                            | 0.00     | 0.60   |
| The toggle's icon: the sun pulls in its rays and becomes the moon | 0.00     | 0.55   |
| The sun sinks behind the hills and turns orange                   | 0.00     | 1.10   |
| The landscape darkens                                             | 0.00     | 1.20   |
| A sunset glow in the sky                                          | 0.00     | 1.70   |
| The moon rises                                                    | 0.35     | 1.45   |
| The stars come out                                                | 0.50     | 1.40   |
| The cottage's windows light up                                    | 0.85     | 1.15   |
| Sound: a soft switch click                                        | 0.00     | 0.12   |

With reduced motion it's a 0.3s crossfade of the colours, with no sun, moon
or stars moving.

## 7. The landscape

The hero is an SVG illustration of a Highland glen: far mountains with peaks,
gullies and shading, a long loch with an islet and a ruined tower, a
white cottage with a smoking chimney, Scots pines, a dry-stone dyke along the
near meadow, gorse or heather or bracken patches by season, and a small herd
of Highland cows grazing. The reference artwork is
[`docs/design/highland-scene.svg`](docs/design/highland-scene.svg).

It is drawn in a `-600 0 2400 320` viewBox with `preserveAspectRatio="xMidYMax
slice"`: it always fills the hero, anchored to the bottom centre. The scene
itself is the `0–1200` band; on each side, 600 units of "more glen" (the
wings) continue the sky, the aurora, the cloud decks, the hills, the meadow,
the dyke, the snow and the haar, with gentle undulations and no new peaks.

Any hero narrower than 7.5:1 is bound by its height, so nothing is cut from
the top: a phone shows about x 330–870, a 1280px laptop about x −40 to 1240,
and a 1920px screen x −360 to 1560, with the sky, the peaks and the sun or the
moon all in view. Everything that matters on mobile (the loch, the islet, the
mother cow and her calf) sits in the middle band. Only screens wider than
2400px lose a little of the sky again.

It is decoration: `aria-hidden`, no focusable parts, and it never intercepts
a click meant for the controls on top of it.

### Layers, back to front

Sky gradient → stars → aurora → moon and sun → weather grey-outs → back cloud
deck → clouds → front cloud deck → haze ridge → far mountains (with their
shading, gullies and snowcaps) → middle hills → cottage and the distant cow →
the first haar band → loch, shimmer, sun reflection, islet and rain ripples →
near meadow, patches and dyke → snow cover → the herd → pines → the two lower
haar bands → the golden-hour tint.

### Season

From the date in Glasgow (`Europe/London`), by whole months:

| Months  | Season | The land                                       | What falls or flies                              |
| ------- | ------ | ---------------------------------------------- | ------------------------------------------------ |
| Mar–May | Spring | Fresh greens, yellow gorse                     | White and pink blossom petals (hawthorn, cherry) |
| Jun–Aug | Summer | Deep greens, purple heather                    | Midges over the loch on still, dry days          |
| Sep–Nov | Autumn | Olive and gold, rust-coloured bracken          | Falling leaves                                   |
| Dec–Feb | Winter | Grey-greens, snowcaps on the peaks, no gullies | Frost glints on the ground on clear, dry days    |

The land colours per season, for day and night, are in
`landscape-palettes.json` (`land`). Special dates (Bonfire Night, Christmas)
can be added later with the same mechanism.

### Time of day

The sky has five moments, `night`, `blue`, `golden`, `morning` and `day`,
each a full set of colours (`skyKeys` in the palettes file: sky, horizon,
clouds, sun, loch, haze, haar, snow, trees, cottage, smoke, stone, rock and a
golden-tint strength). The landscape mixes between two neighbouring moments
by the **sun's elevation in Glasgow**, so the same code works in June, when
the sun barely sets, and in December, when it never climbs above 11°:

| Sun's elevation | Sky                  | Land light |
| --------------- | -------------------- | ---------- |
| ≤ −12°          | `night`              | 0          |
| −12° to −4°     | `night` → `blue`     | 0 → 0.15   |
| −4° to 0°       | `blue` → `golden`    | 0.15 → 0.6 |
| 0° to 6°        | `golden` → `morning` | 0.6 → 0.9  |
| 6° to 20°       | `morning` → `day`    | 0.9 → 1    |
| > 20°           | `day`                | 1          |

"Land light" mixes each season's night land colours (0) into its day ones
(1). The mock-up's hour-by-hour plan for a day with sunrise at 07:00 and
sunset at 18:00 is in the palettes file (`hourPlanExample`) to check the
result against.

- **The sun** crosses the sky from sunrise (left, x 150) to sunset (right,
  x 1050), on an arc from y 210 at the horizon to y 45 at solar noon,
  whatever the season, so it's always visible above the mountains.
- **The moon** does the same across the night, from x 200 to x 1000, peaking
  at y 60. It's a crescent.
- **Stars** show at night, fading in through the `blue` moment.
- **The cottage's windows** are lit (`#F4C95D`) at night and in the `blue` and
  `golden` moments, grey in daylight. Its chimney smokes in autumn and winter.
- **The aurora** shows on clear winter nights (clouds ≤ 1, from 21:00 to
  01:00), a slow green ribbon. It's rare in Glasgow, and that's the joke.

The palette updates once a minute. Colours change with a 1.1s transition, so
dawn and dusk drift rather than tick.

### Weather

The weather is four levels from 0 to 10 and two switches. The live values
come from Glasgow (below); the gear lets visitors set them (section 8).

| Input       | What it does in the scene                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clouds 0–10 | Shows `round(n × 1.3)` of the 13 clouds, each with its twin (a 26-cloud sky for the wide drawing, the twin half a crossing behind and a little higher or lower, larger or smaller). From 6 a back cloud deck fades in (`(n − 5) / 5`), from 8 a front deck (`(n − 7) / 3 × 0.9`), and every other cloud turns the darker cloud colour. The sky greys by `n × 3.5%`. The sun or moon fades from 7 (`1 − (n − 6) / 3.5`); the stars fade with any cloud (`1 − n / 8`). |
| Rain 0–10   | The sky greys a further `n × 4%`, the sun or moon fades (`1 − n / 4`), rings ripple on the loch (`0.4 + n × 0.05`), and `n × 10` raindrops fall. Rain also means at least `n + 3` clouds.                                                                                                                                                                                                                                                                            |
| Wind 0–10   | Clouds drift `1 + n × 0.45` times faster, pines sway faster (period `max(0.9, 5 − n × 0.45)`s) and harder from 4, particles fall `1 + n × 0.18` times faster, and from 5 the rain slants and leaves blow sideways.                                                                                                                                                                                                                                                   |
| Snow        | Precipitation falls as `n × 8` snowflakes instead of rain; from level 3, snow settles on the land (a white layer at 62%). Snowcaps show in winter anyway.                                                                                                                                                                                                                                                                                                            |
| Haar        | Three bands of sea fog drift across the glen at 80% opacity.                                                                                                                                                                                                                                                                                                                                                                                                         |

### Live Glasgow weather

- A route on our Worker (`GET /api/weather`) asks
  [Open-Meteo](https://open-meteo.com/) for Glasgow's current weather and
  caches the answer for 30 minutes, so the site makes at most about 48 calls
  a day per Cloudflare data centre whatever the traffic. A failure is cached
  for 5 minutes, so the site doesn't call Open-Meteo on every page view while
  it refuses, and each one is logged with its reason. No cron, no API key.
- The page renders without weather (season and time only), then fetches
  `/api/weather` after hydration and lets the weather roll in with the 1.1s
  transition. A failed or slow fetch leaves the sky as it is; the chip then
  shows only the time.
- **Mapping**, to be checked against Open-Meteo's documentation for each
  variable and unit:
  - clouds: cloud cover in %, divided by 10 and rounded;
  - rain: precipitation in mm over the last hour: 0 → 0, ≤ 0.2 → 1,
    ≤ 0.5 → 2, ≤ 1 → 3, ≤ 2 → 4, ≤ 3 → 5, ≤ 4 → 6, ≤ 6 → 7, ≤ 8 → 8,
    ≤ 12 → 9, more → 10; drizzle codes mean at least 1, thunderstorm codes at
    least 7;
  - snow: a snowfall or snow-shower weather code, or snowfall above 0;
  - haar: a fog weather code;
  - wind: the wind speed at 10m on the Beaufort scale, capped at 10;
  - the chip's temperature: rounded to a whole degree.
- **Attribution:** Open-Meteo's terms ask for a credit under CC BY 4.0. The
  footer says "Weather data by Open-Meteo.com" with a link.
- **The weather chip** reads "Glasgow · 15:04 · 9°C · Drizzle" on desktop and
  "9°C · Drizzle" on mobile, in Glasgow's time. It's a button that opens the
  gear's panel.

### Particles

Particles are HTML elements over the hero, in their own layer, with
`pointer-events: none`. The ones that fall (leaves, petals, rain and snow) sit
under a mask that fades them out from 34% to 70% of the hero's height, so they
never fall over the name or the chat. Midges and glints stay where the scene
has them, over the loch and on the near meadow, outside the mask.

| Particle | When                                                       | How many                                      |
| -------- | ---------------------------------------------------------- | --------------------------------------------- |
| Leaves   | Autumn                                                     | 12, fewer as rain rises (`× (1 − rain / 12)`) |
| Petals   | Spring                                                     | 14, fewer as rain rises                       |
| Midges   | Summer, wind < 4 and rain < 3; a small cloud over the loch | 16                                            |
| Glints   | Winter, daytime, dry, clouds < 4; on the near meadow       | 10                                            |
| Rain     | Rain > 0, no snow                                          | `rain × 10`                                   |
| Snow     | Rain > 0 with snow                                         | `rain × 8`                                    |

Leaves and petals fall with a gentle sway, rain falls fast and straight
(slanted in wind), snow drifts, midges buzz in place and glints twinkle.
Their colours are in the palettes file (`particles`). Positions and timings
come from a seeded pseudo-random function, so server and client agree and a
reload looks the same.

### The herd

Full-body Highland cows, much smaller than the assistant's head, so the
assistant is still the star. Reference:
[`docs/design/herd-cow.svg`](docs/design/herd-cow.svg) (drawn facing right,
feet on `y = 0`).

| Cow        | Where (viewBox)                  | Scale | Faces | What it does                      |
| ---------- | -------------------------------- | ----- | ----- | --------------------------------- |
| The grazer | x 420, y 294                     | 0.80  | Right | Grazes (16s loop)                 |
| The calf   | x 598, y 296                     | 0.48  | Right | Looks around (11s loop); no horns |
| The mother | x 655, y 294                     | 0.72  | Left  | Grazes (19s loop, offset)         |
| Far away   | x 1118, y 222, on the right hill | 0.26  | Right | Grazes; only on wide screens      |
- **Grazing:** the head lowers to the grass (46°), nibbles, lifts to look
  around, and lowers again. **Looking:** the head turns up and down without
  grazing. **Every cow** swishes its tail at flies every 4.5s (2.8s for the
  calf).
- They darken with the landscape at night (brightness 0.62, and 0.82 in the
  `blue` and `golden` moments).
- The assistant's cow doesn't appear in the landscape: its head is far bigger
  than the herd and would break the scale. It lives only in the chat.

### Performance

- The scene is server-rendered inline SVG. The first paint has the right
  season, time and theme; JavaScript only adds the clock, the weather and the
  gear.
- Only `transform` and `opacity` animate, and only with CSS.
- All animations pause (`animation-play-state: paused`) while the tab is
  hidden.
- The hero has a fixed height, so nothing shifts when the weather or the fonts
  arrive.
- Each SVG gradient id is unique per instance; duplicate ids make every
  instance use the first one's colours.

## 8. Play with the sky

A gear lets visitors play with the landscape, like the rainbow on Josh
Comeau's blog. It's a toy, and it's honest about being one.

- **The gear isn't there at first.** It spins in 2s after the page's
  entrance ends (section 11; 2s after the page is ready with reduced motion) and pulses three
  times so it's noticed. On a first visit, a small bubble under it, its tail
  pointing up at the gear, says "Psst… you can change the weather" and goes
  away after 5s or on any tap; the site remembers it was shown.
- **The panel** is a bottom sheet on mobile and a popover under the gear on
  desktop (about 380px wide), with a "Close" button in its header. Title
  "Play with the sky", subtitle "Only on your screen, for as long as you
  like." Its backdrop stays clear and the sheet stops short of the hero, so
  the sky can be watched while it changes. In the sheet, "Back to live
  Glasgow" is a sticky footer under the scrolling controls, so the way back
  is always in view, even on a short phone.
  - **Season:** four segmented buttons.
  - **Time of day:** a slider from 00:00 to 23:00 whose track is a gradient
    from night through dawn, day and dusk back to night. Label: "15:00 · day",
    "07:00 · golden hour", "22:00 · night".
  - **Clouds, Rain (or Snow), Wind:** sliders from 0 to 10 whose tracks show
    what they do (pale sky to grey, dry to dark blue, pale to deep green),
    with words at both ends and a word for the current value:
    - clouds: Clear, Clear, A few clouds, A few clouds, Some clouds, Cloudy,
      Cloudy, Mostly cloudy, Mostly cloudy, Overcast, Overcast;
    - rain: Dry, Drizzle, Drizzle, Light, Light, Steady, Steady, Heavy,
      Heavy, Downpour, Downpour;
    - wind: Calm, Breeze, Breeze, Fresh, Fresh, Windy, Windy, Strong, Strong,
      Gale, Gale.
  - **Switches:** "Snow instead of rain" and "Haar".
  - **"Back to live Glasgow"**: a wide flat button with the live dot.
- **Playing starts on the first change.** Opening the panel shows the
  controls set to the live sky on screen, and changes nothing: the chip stays
  live, the sky follows the clock and the theme rule is untouched. The first
  change to any control (a season, the time, a level, a switch) starts
  playing from the live sky at that moment, with that change. Closing the
  panel without a change leaves everything live, and pressing the theme
  toggle then is an ordinary toggle.
- **While playing**, the slider's time also drives the theme (night is dark),
  the chip turns `accent` and reads "Your sky · 15:00 · tap to reset" ("Your
  sky · 15:00" on a phone), and tapping it goes back to live. A season other
  than today's moves the date to the 15th of its middle month, as `?sky=`
  does, so summer's evenings stay light. Pressing the theme toggle while
  playing moves the time to 13:00 (light) or 22:00 (dark); on a summer day
  when 22:00 isn't night, to the hour nearest that night's solar midnight.
- **Nothing is stored.** A reload, or "Back to live Glasgow", returns to the
  real sky and the theme rule from section 6.
- The sliders are native range inputs with `aria-valuetext` set to the words,
  and the whole panel works with the keyboard. Escape closes it and returns
  focus to the gear.

## 9. The assistant

The assistant is a Highland cow, "in honour of the country that welcomed me".
It is a character, not Julian: the bot speaks about him in the third person,
and the site's promise is that it never pretends to be him. Reference
artwork: [`docs/design/assistant-cow.svg`](docs/design/assistant-cow.svg).

It's a flat illustration in the landscape's style: ginger fringe hiding the
eyes, messy tips, short trimmed chin hair, horns that go out and bend up,
pale muzzle. Its parts are grouped so each animation moves only what it
should: `tilt` (the whole head), `jaw` (chin and mouth line), `talk` (the open
mouth), `licks` with `lick-r`, `lick-l` and `lick-mouth` (the tongue to either
side). Only the mouth opens; nothing else separates and no background shows
through.

### Its states

| State                | When                                                             | What it does                                                                                                              |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Idle                 | Nothing is happening                                             | A 12s loop: tilts one way (18–26%), licks to the right (44–58%), tilts the other way (66–70%), licks to the left (76–90%) |
| Listening            | The visitor is typing                                            | Holds its head tilted, as if listening                                                                                    |
| Thinking             | A question was sent and no word is on screen yet                 | Chews (the jaw moves side to side every 0.55s) with a slight thoughtful tilt                                              |
| Talking              | The answer is typing itself out, from its first word to its last | The mouth opens and closes, irregularly, every 1.8s                                                                       |
| Satisfied            | The answer just finished typing                                  | Licks once (1.6s), then goes back to idle                                                                                 |
| Sorry                | An error or the daily limit                                      | Lowers its head and stays still                                                                                           |
| Hover (pointer only) | The pointer is over it                                           | Tilts and says "Moo!" in a small speech bubble above it, its tail pointing down at the cow                                |
| Tap                  | It's tapped                                                      | Licks and, if sound is on, moos softly (at most once every 3s). While it talks it only moos: a lick would cover the mouth |
- **There is one cow**, 100px wide on a phone and 132px from `lg`, on the
  chat's edge (section 5). It's the greeting's cow and every answer's: no cow
  sits beside the greeting, an answer, a question waiting for its answer or
  an error. It goes through
  every state above, and rises 8px over the edge while it thinks and on
  hover. When the edge has scrolled out of view nothing is lost: the status
  pill and the screen-reader announcements say what is happening in words.
- Its two front hooves are part of its drawing on the edge: two rounded
  shapes, 17 × 11px, in its darkest brown (`strand`), 26px in from each side
  and 17px up from its bottom at 132px, scaled with it on a phone.
- It's a button labelled "Pat the cow", for the tap. The tap and hover are
  extras; nothing depends on them.
- With reduced motion it's a still drawing in every state.

## 10. The chat

The chat should feel smooth, warm and quick. These are the five states on
mobile; desktop is the same inside the right-hand card.

1. **Typing.** The composer grows as the visitor types, up to 6 lines, and its
   border lights up in `accent`. The cow listens. The character counter only
   appears near the limit (from 900 of 1,000). Hint under the box: "Enter to
   send · Shift+Enter for a new line" (hidden on touch screens).
2. **Thinking.** The question jumps into place as a bubble, with a small
   bounce and a "pop". The cow chews. A status pill says what's happening in
   words ("Looking up claims…") with three bouncing dots. Send becomes Stop.
3. **Answering.** The answer types itself out. What has arrived waits in a
   buffer and appears word by word at a steady pace, whatever pace the
   stream has: about 60 characters a second, faster when it falls more than
   about 1.5s behind, so a long answer never lags far. Each word fades in
   over 0.2s; earlier text never re-animates and the page never jumps. A
   citation appears whole, with the word before it, as a small green
   number. The cow talks from the first word to the last, even after the
   stream has ended; while the typing waits for more text it keeps talking
   rather than going back to thinking. Stop, or an error, shows the rest of
   what has arrived at once. The view follows the typed text only if the
   visitor was already at the bottom; if they scrolled up to read, a "New
   answer ↓" pill appears instead.
4. **Done**, when the last word is on screen, not when the stream ends. The
   cow licks once, satisfied. The sources rise in one by one
   (80ms apart) as numbered chips, such as "1 · Julian · Work mode". Tapping
   a chip opens the claim exactly as Julian confirmed it, with "Confirmed by
   Julian on 27 Oct 2026 · from his CV". Under the answer: "Copy", and "Keep
   asking" with the suggested questions not asked yet.
5. **Out of questions, or something went wrong.** Errors are warm too: the cow
   lowers its head, the message says what happened and offers another way
   (the contact form, LinkedIn). Never a bare red error. For the daily limit:
   "You've reached today's limit for questions. Come back tomorrow, or write
   to Julian directly. He reads every message." The composer's placeholder
   becomes "Questions are back tomorrow".

### Details that don't show in a picture

- **Suggested questions:** tapping one flies it into place as the visitor's
  bubble (a FLIP animation) and plays the "pop".
- **Citations are buttons:** each number opens its claim. This is what sets
  the bot apart: you can see where every sentence comes from. To show the
  claim's text and confirmation date, the `data-sources` part carries them;
  the model, the prompt and the tools don't change.
- **Copy** copies the answer as plain text with its sources listed at the
  end, ready to paste into an email.
- **Screen readers:** "Answering…" is announced when an answer starts, and the
  full answer once when it has finished typing, never piece by piece. This settles the
  VoiceOver check left open in phase 4.
- **Keyboard:** Enter sends, Shift+Enter adds a line, Escape stops an answer
  that's still arriving or typing when focus is in the composer.
- **Mobile:** the composer is fixed to the bottom above the keyboard, with
  the safe-area inset; its "Your question" label is hidden visually there, to
  save height, and stays as the box's accessible name. Every button is at
  least 44px.
- **Greeting:** "Hi! Ask me about Julian's experience. I only answer with
  facts he has confirmed, and I show where each one comes from."

The copy in this file is the starting point. Julian approves every visible
text, in both languages, in the pull request that adds it.

## 11. Motion

| What                                    | Duration                                                                                                       | Easing                                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| UI colours on a theme change            | 0.6s                                                                                                           | `ease`                                             |
| Theme toggle (sunset or sunrise)        | 1.7s                                                                                                           | Section 6                                          |
| Theme change at Glasgow's dusk          | about 6s                                                                                                       | Same choreography, stretched                       |
| Landscape colours (time, weather)       | 1.1s                                                                                                           | `ease`                                             |
| The visitor's bubble appears            | 0.5s                                                                                                           | `cubic-bezier(.3, 1.5, .5, 1)` (a small overshoot) |
| Source chips rise                       | 0.45s, 80ms apart                                                                                              | `cubic-bezier(.3, 1.4, .5, 1)`                     |
| A claim opens                           | 0.35s                                                                                                          | `ease`                                             |
| Each word as an answer types itself out | 0.2s fade; about 60 characters a second, faster when more than about 1.5s behind                               | `ease`                                             |
| Button press                            | 80ms                                                                                                           | `ease`                                             |
| The gear spins in                       | 0.6s, 2s after the entrance                                                                                    | Spring-like overshoot, then 3 pulses               |
| Clouds cross the sky                    | 1700 units in 120–190s, over a 2900-unit loop (205–324s)                                                       | `linear`                                           |
| Particles, before the wind              | Leaves 7–11s, petals 8–12s, rain 0.6–0.9s and snow 6–10s a fall; midges buzz in 1.2–2s, glints twinkle in 2–4s | `linear` falls; sways and twinkles `ease-in-out`   |
| The herd's loops                        | 11s, 16s, 19s                                                                                                  | `ease-in-out`                                      |

### Entrance

The first look builds attention in order: who Julian is, then the glen, then
the cow, and only then the chat. The times are from the page's first paint;
"rise" is a small move up with a fade. Only `transform` and `opacity`
animate.

On a first visit, or the first in a week:

| When                   | What                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.08s to 0.32s         | The name, the role, the line, and "Download CV" and "Contact" rise, 80ms apart, 0.45s each. The portrait drops in at 0.1s (0.6s). The hero's buttons pop in from 0.3s, 70ms apart. They work from the start.                                                                                                                                                                                                                                            |
| 0.6s to about 3.9s     | The glen wakes, slowly. The sky fades in (1.05s from 0.6s). The land rises back to front: far hills from 0.68s, middle from 0.87s, near land from 1.05s, 1.5s each. The loch fades in at 1.2s, the trees grow one after another from 1.43s to 1.85s, the cottage pops at 1.73s, the haar fades in at 1.5s, the two herd groups walk in at 1.88s and 2.03s (1.8s each), and the particles fade in at 2.4s.                                               |
| 2.5s                   | The cow appears big in the middle of the hero, about 200px wide (at most 62% of the hero's height), scaling up from nothing with a small overshoot (0.6s). It talks.                                                                                                                                                                                                                                                                                    |
| 3.15s                  | A speech bubble says "Hi! I'm the Highland cow" ("¡Hola! Soy la vaca de las Highlands"), with no full stop and its text centred, for 1.7s. From `lg` it's a pill above the cow. On a phone it sits beside the cow's head, under the hero's controls and clear of them, wrapping naturally in about 92px with a 14px radius and a comic-style tail on its left edge, pointing down towards the cow's mouth. It's decoration, hidden from screen readers. |
| 4.25s                  | It stops talking and licks once.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 4.3s                   | The chat's edge draws itself: the card's border fades in over 0.6s on desktop, and the phone's line grows from left to right over 0.7s.                                                                                                                                                                                                                                                                                                                 |
| 4.6s                   | The cow flies from the hero to its place on the edge, scaling down to its size there (0.55s, `cubic-bezier(.5, 0, .2, 1)`, `transform` only).                                                                                                                                                                                                                                                                                                           |
| 5.15s, when it lands   | The chat appears: "Ask me about Julian", the greeting bubble and its row rise (0.5s). The suggestions and the composer follow 0.15s later. Until then they take their space but are invisible, so nothing shifts.                                                                                                                                                                                                                                       |
| 0.4s after landing     | The greeting types itself out at the answers' pace (section 10), and the cow talks until the last word.                                                                                                                                                                                                                                                                                                                                                 |
| When the greeting ends | The cow licks once and the three suggestions rise, 80ms apart, like source chips. The entrance is over about 1.2s later, at roughly 9s.                                                                                                                                                                                                                                                                                                                 |

On every other visit, the glen wakes quickly and the chat fades in, with no
cow presentation. All of it is over in about 2s:

| When           | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0s to 0.32s    | The name, the role, the line and the buttons rise as in the full entrance. The portrait drops in at 0.25s (0.6s), and the hero's buttons pop in.                                                                                                                                                                                                                                                                                                                       |
| 0s to about 2s | The glen wakes at its quick pace. The sky fades in (0.7s), and the sun rises from 0.15s (1.1s). The land rises back to front, 1s each: far hills from 0.05s, middle from 0.18s, near land from 0.3s. The loch fades in at 0.4s (0.8s) and the clouds at 0.25s (1.2s). The trees grow from 0.55s to 0.83s (0.7s each), the cottage pops at 0.75s, the haar fades in at 0.6s, the herd groups walk in at 0.85s and 0.95s (1.2s each), and the particles fade in at 1.2s. |
| 0.2s           | The chat fades in over 0.4s, all of it at once: the cow already on the edge, the heading, the greeting complete, the suggestions and the composer. Nothing types itself out.                                                                                                                                                                                                                                                                                           |

Around both:

- **Any tap, key, wheel or touch ends it at once.** Everything jumps to the
  end state: the chat visible, the greeting complete, the suggestions shown
  and the cow on the edge. A key that moves focus into the composer
  therefore finds it visible.
- **The server knows which one to play.** A cookie, set for 7 days and
  refreshed on every visit, says a visitor has been here that week, so the
  first HTML already has the right entrance and nothing flashes.
- **It never leaves the page stuck.** Without JavaScript, or if it fails,
  everything ends visible within about 6s, the cow on the edge. When
  JavaScript starts late, the entrance carries on from the beat it has
  reached: a cow that should already be in the hero appears there, a flight
  that has begun is skipped, and a greeting already on screen stays whole. A
  page opened in a background tab starts the entrance when it's first shown.
- **The gear waits** until 2s after it ends (section 8).
- **Screen readers** have the chat from the start: it's hidden with
  `opacity`, never `display` or `visibility`, and the greeting's full text is
  readable at once; only its typed words are decorative.
- **Sound:** none here.

### Reduced motion

With `prefers-reduced-motion: reduce`:

- no entrance: the page appears at once;

- no particles, no drifting clouds or haar, no swaying pines, no herd or cow
  animation, no bounces, no FLIP;
- the theme changes with a 0.3s crossfade, and the landscape's colours change
  instantly;
- answer text appears as it arrives, without typing itself out or fading;
  sources appear without rising;
- the gear appears without spinning or pulsing.

## 12. Sound

Sounds are **on by default**, quiet, and one tap away from off.

- They play through [use-sound](https://github.com/joshwcomeau/use-sound)
  from a single audio sprite. The sounds issue checks that it works with
  React 19 before relying on it.
- Browsers block audio until the first interaction with the page. That's
  fine: every sound here answers something the visitor did.
- **The sound toggle** is always visible (in the hero, and in the compact bar
  on mobile). The choice is stored in a cookie (`sound=on|off`), so the
  server renders the right icon.
- All sounds are short and quiet (the loudest at about half volume), and no
  sound plays more than once every 150ms.

| Moment                               | Sound                                 |
| ------------------------------------ | ------------------------------------- |
| Send a question                      | A "pop"                               |
| An answer starts                     | A soft brush                          |
| An answer ends                       | A short chime                         |
| Tap the cow                          | A soft "moo" (at most once every 3s)  |
| Theme toggle                         | A switch click                        |
| Language toggle                      | A soft tick                           |
| Release a slider in the gear's panel | A soft click                          |
| Heavy rain (7 or more)               | A rain loop, very low, while it lasts |
| Download the CV                      | A paper rustle                        |

Which sounds: Julian's own (made with his synths) or a CC0 pack such as
Kenney's Interface Sounds, plus a CC0 moo. The sounds issue asks Julian before
it starts, and records each file's source and licence in `docs/sounds.md`.

## 13. The portrait

Julian's pixel-art portrait, cropped from his full pixel art with his face
centred and the background left exactly as it is: no blur, no fade.

| File                              | Crop               | Size        | Shown at                                     |
| --------------------------------- | ------------------ | ----------- | -------------------------------------------- |
| `public/images/julian.png`        | 68 × 85 pixels, ×6 | 408 × 510px | 96 × 120px on mobile, 120 × 150px on desktop |
| `public/images/julian-square.png` | 74 × 74 pixels, ×6 | 444 × 444px | 34px in the compact bar                      |
- It's **mirrored** with CSS (`transform: scaleX(-1)`), so he leans into the
  page, towards his name.
- `image-rendering: pixelated`, so the pixels stay sharp.
- A ring of `background` around it (4px on mobile, 6px on desktop) separates
  it from the landscape.
- Alt text: "Pixel-art portrait of Julian Palomo" ("Retrato en pixel art de
  Julián Palomo" in Spanish).
- Like the claims, the portrait is personal content (`LICENSE`, section 2).

## 14. CV and contact

- **"Download CV"** downloads the Software Engineer version of Julian's CV
  **without his phone number or email address**, with LinkedIn, GitHub and
  this site as contact. Julian provides the PDF; it never contains private
  data, because the repo is public.
- **"Contact"** opens a form: a bottom sheet on mobile, a dialog on desktop.
  Fields: name, email (so Julian can reply), message (up to 2,000
  characters). Protected by Cloudflare Turnstile and a hidden honeypot field,
  and limited per visitor per day like the chat. The message goes to Julian's
  email from the server; his address is a secret and never appears in the
  repo or the page. Success: "Thanks! Julian will get back to you." and the
  cow licks, satisfied.

### Sharing

- **The link preview** (`og:image`) is a 1200 × 630 card per language,
  `public/og/en.png` and `public/og/es.png`. It shows the landscape, still, on
  a warm autumn afternoon (the sun low, at 8°, at 17:10 on 15 October) with a
  clear sky and the herd; the
  portrait with its ring; the name and the role from `src/lib/site.ts`; and
  the assistant cow with a speech bubble: "Ask me about Julian's experience"
  ("Pregúntame por la experiencia de Julián"). Light theme only: previews
  have no dark mode.
- **The icon** is the cow's head, from the assistant cow's drawing without
  its mouth and tongue: `favicon.svg`, a 32px `favicon.ico`, and a 180px
  `apple-touch-icon.png` on `tint`.
- `pnpm og` draws all of them with the site's own components (`scripts/og/`),
  so they never drift from the site; nothing is drawn by hand.

## 15. Accessibility

- Contrast: WCAG AA for every text and UI pair, in both themes (section 2).
- Focus: a visible 3px `accent` ring with a 2px offset on every interactive
  element, including on top of the landscape.
- Everything works with the keyboard alone; dialogs and the gear's panel trap
  focus while open and give it back when they close.
- The landscape, the particles and the herd are `aria-hidden`; the
  assistant's one cow, on the chat's edge, is the "Pat the cow" button.
  The weather chip has an accessible name ("Weather in Glasgow:
  9°C, drizzle. Play with the sky", and while playing "Your sky, 15:00. Back
  to live Glasgow").
- `lang` on `<html>` matches the page's language, and each page links its
  other language with `hreflang`.
- Reduced motion (section 11) and muted sound (section 12) lose nothing.
- Every icon-only button has a label ("Switch to dark theme", "Mute sounds",
  "Ver en español").

## 16. Reference files

[`docs/design/`](docs/design/) holds the artwork the components are built
from. Nothing in it is imported by the app.

| File                      | What it is                                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `highland-scene.svg`      | The whole landscape (autumn, 15:00, a few clouds), with its layer classes and the CSS that animates them |
| `landscape-palettes.json` | The five sky moments, the land per season, the cloud table, the cows' and particles' colours             |
| `assistant-cow.svg`       | The assistant, with its part groups and its keyframes; the idle loop runs when you open it               |
| `herd-cow.svg`            | One cow from the herd, grazing                                                                           |

Open the SVGs in a browser to see them animate.

## 17. Not in this design

- Clicking a falling leaf to hear it crunch. Particles never take clicks.
- A babbling voice while the cow talks.
- Special dates (Halloween, Bonfire Night, Christmas). The season mechanism
  allows them later.
- More pages. The site is one page in two languages.
