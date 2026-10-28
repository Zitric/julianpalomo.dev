---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# Styling

Tailwind CSS 4 through `@tailwindcss/vite`. `src/styles/app.css` imports
Tailwind, `tokens.css` and `fonts.css`; `src/routes/__root.tsx` links `app.css`.

## Fonts live only in `src/styles/fonts.css`

- Bricolage Grotesque and Inter, self-hosted from `@fontsource-variable/*`, never from Google Fonts. Only the Latin subset, declared by hand there because Fontsource's own stylesheets declare every subset.
- `font-sans` (Inter) is the default; `font-display` (Bricolage Grotesque) is for the name, the role, titles and buttons with text. Sizes and weights follow `DESIGN.md` section 3.
- `src/routes/__root.tsx` preloads the same two `.woff2` files with `?url` imports. A font file changed in one place changes in the other.

## Colours live only in `src/styles/tokens.css`

- Each colour is a CSS variable, defined three times: the light default on `:root`, dark under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and dark again under `:root[data-theme="dark"]`. Keep the two dark blocks in step.
- `@theme inline` exposes each variable as a Tailwind colour (`bg-background`, `text-foreground`, `text-muted`). A new colour is a new variable in all three blocks plus a line in `@theme inline`.
- **No colour literals in components**: no hex, `oklch()` or Tailwind palette colours like `text-gray-500`. Use the token utilities.
- **No `dark:` variants.** Dark mode is the tokens' job; a colour that differs in dark mode is a token.
- Values are hex (`rgb()` for the translucent `glass`), matching the table in `DESIGN.md` section 2.
- **Contrast is tested.** `tests/unit/tokens.test.ts` reads `tokens.css` and checks each pair on screen against WCAG AA in both themes (4.5:1 for text, 3:1 for field borders), and that the two dark blocks match. A new pair gets a line in its `pairs` list; a failing pair changes the value, and the `DESIGN.md` table with it.
- Fields (the composer, form inputs) are outlined in `field-border`, which reaches 3:1; `border` is for chips and dividers only.

## Markup

- Tailwind utilities only. No inline `style` except genuinely dynamic values.
- Readable JSX: hoist nested ternaries and string-building into named consts above the `return`. No value in the markup should take more than a few seconds to understand.
- Semantic elements first (`main`, `h1`, `nav`, `button`); the e2e test finds the page by role (`tests/e2e/home.spec.ts`).
- The layout works at 375px wide (small phone) before anything else.

If `tokens.css` or `app.css` change shape, update this rule.
