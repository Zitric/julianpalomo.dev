---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# Styling

Tailwind CSS 4 through `@tailwindcss/vite`. `src/styles/app.css` imports
Tailwind, `tokens.css`, `fonts.css`, `landscape.css`, `play.css` and `cow.css`;
`src/routes/__root.tsx` links `app.css`.

## Fonts live only in `src/styles/fonts.css`

- Bricolage Grotesque and Inter, self-hosted from `@fontsource-variable/*`, never from Google Fonts. Only the Latin subset, declared by hand there because Fontsource's own stylesheets declare every subset.
- `font-sans` (Inter) is the default; `font-display` (Bricolage Grotesque) is for the name, the role, titles and buttons with text. Sizes and weights follow `DESIGN.md` section 3.
- `src/routes/__root.tsx` preloads the same two `.woff2` files with `?url` imports. A font file changed in one place changes in the other.

## Colours live only in `src/styles/tokens.css`

- Each colour is a CSS variable, defined twice: light on `:root` and dark on `:root[data-theme="dark"]`. The server always renders `<html data-theme>`, from the `theme` cookie or Glasgow's sun (`src/components/theme/Theme.tsx`), so the OS setting plays no part and there is no `prefers-color-scheme` block.
- Each variable is also registered with `@property` as a `<color>`, so a theme change can transition it. `app.css` transitions every token on `:root` only while `<html data-theme-change>` is set: 0.6s for the toggle, 6s when Glasgow's dusk or dawn arrives, 0.3s under reduced motion. Colours never animate on load or hydration.
- `@theme inline` exposes each variable as a Tailwind colour (`bg-background`, `text-foreground`, `text-muted`). A new colour is a new variable in both blocks, an `@property`, a name in `app.css`'s `transition-property` list and a line in `@theme inline`.
- **No colour literals in components**: no hex, `oklch()` or Tailwind palette colours like `text-gray-500`. Use the token utilities.
- **No `dark:` variants.** Dark mode is the tokens' job; a colour that differs in dark mode is a token.
- Values are hex (`rgb()` for the translucent `glass`), matching the table in `DESIGN.md` section 2.
- **Contrast is tested.** `tests/unit/tokens.test.ts` reads `tokens.css` and checks each pair on screen against WCAG AA in both themes (4.5:1 for text, 3:1 for field borders), and that every token is registered and transitioned. A new pair gets a line in its `pairs` list; a failing pair changes the value, and the `DESIGN.md` table with it.
- Fields (the composer, form inputs) are outlined in `field-border`, which reaches 3:1; `border` is for chips and dividers only.

## The one exception: the illustrations' palette

- The colours of the illustrations (the landscape and the cows) are part of the artwork, not UI, so they are data in `src/lib/scene/palette.ts`, copied from `docs/design/landscape-palettes.json` (`DESIGN.md` section 2): the assistant cow, the five sky moments, the land per season, the herd, the particles, and `sceneFixed` for the few colours the reference SVGs' own stylesheets hold. `tests/unit/assistant-cow.test.ts` and `tests/unit/scene.test.ts` keep it equal to the JSON.
- Only illustration components read it, and only for their drawing's fills and strokes. A bubble, chip or button on top of an illustration uses tokens like any other UI.

## The gear's panel styles live in `src/styles/play.css`

- The third exception to "Tailwind utilities only": the `<dialog>`'s sheet and popover layout and its clear backdrop, the range inputs' gradient tracks and two-tone thumbs, and the gear's entrance. Colours are tokens only (the `track-*` tokens for the tracks); `tests/unit/tokens.test.ts` checks the thumbs reach 3:1 against every track and the panel. Everything that moves sits inside `prefers-reduced-motion: no-preference`.

## The landscape's SVG styles live in `src/styles/landscape.css`

- The second exception to "Tailwind utilities only": SVG parts, keyframes and `transform-box` rules, ported from the `<style>` of `docs/design/highland-scene.svg` and `herd-cow.svg`, with keyframes prefixed `landscape-`. It has no colour literals: `src/components/landscape/Landscape.tsx` puts every colour and level on the SVG root as a custom property, computed by `src/lib/scene/`, and switches parts with `data-` attributes (`data-season`, `data-snowy`, `data-haar`, `data-aurora`, `data-choreography`, `data-paused`).
- Every animation and transition sits inside `prefers-reduced-motion: no-preference`, so with reduced motion nothing in the hero moves and colours change instantly. Loops animate only `transform` and `opacity`; colours transition over 1.1s, and with the timings of `DESIGN.md` section 6 during a theme toggle.
- `tests/unit/landscape-drawing.test.ts` renders the landscape and checks every shape against the reference, in order. Never redraw a part: copy it from the reference.
- The particles (`src/components/landscape/Particles.tsx`) live there too: HTML elements in a size container over the hero, so `cqh` is the hero's height and a scene coordinate x sits at `50% + (x − 600) × 100cqh / 320`. Each particle's position, size, timing and colour arrive as custom properties computed by `src/lib/scene/particles.ts`. With reduced motion the layer isn't shown at all.

## The assistant cow's motion lives in `src/styles/cow.css`

- Its keyframes come from the `<style>` of `docs/design/assistant-cow.svg`, prefixed `cow-`, and are keyed by the `data-state` and `data-pat` that `src/components/cow/AssistantCow.tsx` sets. Only the latest cow has `.cow-live`, so only it moves.
- Every rule that moves it sits inside `prefers-reduced-motion: no-preference`, so with reduced motion it's the still drawing in every state. Only `transform` and `opacity` animate.
- The lick lasts 1.6s here and in `LICK_MS` (`src/lib/cow-state.ts`); keep the two in step.

## Focus

- `app.css` gives every `:focus-visible` element a 3px `accent` outline 2px away (`DESIGN.md` section 15). Never remove it without a replacement.
- A field shows focus on its box instead: the border turns `accent` with a 4px `ring-accent/22` glow, and the field keeps a transparent 2px outline, which is what Windows high-contrast mode paints when it drops the glow. `src/components/chat/Composer.tsx` is the exemplar.

## Shared pieces live in `src/components/ui/`

- Small, typed and feature-free. `IconButton` is a round, flat, 44px icon-only button with a required `label` (its accessible name) and a `look`: `accent`, `glass` (`bg-glass` with a 6px blur) for buttons on the landscape, or `tint` for buttons on a panel. Its press scale (0.92 over 80ms) runs only under `motion-safe`.
- `Button` is the wide, flat, fully round button (`DESIGN.md` section 4), with a `look` (`primary` today) and a 0.97 press scale under `motion-safe`. "Back to live Glasgow" is its first caller.
- A piece, or a new look of one, is added with its first caller, not ahead of it.

## Markup

- Tailwind utilities only. No inline `style` except genuinely dynamic values.
- Readable JSX: hoist nested ternaries and string-building into named consts above the `return`. No value in the markup should take more than a few seconds to understand.
- Semantic elements first (`main`, `h1`, `nav`, `button`); the e2e test finds the page by role (`tests/e2e/home.spec.ts`).
- The layout works at 375px wide (small phone) before anything else.

If `tokens.css`, `fonts.css`, `cow.css`, `landscape.css`, `play.css`, `app.css`, `src/lib/scene/palette.ts` or `src/components/ui/` change shape, update this rule.
