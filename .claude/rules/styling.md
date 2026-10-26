---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# Styling

Tailwind CSS 4 through `@tailwindcss/vite`. `src/styles/app.css` imports
Tailwind and `tokens.css`; `src/routes/__root.tsx` links `app.css`.

## Colours live only in `src/styles/tokens.css`

- Each colour is a CSS variable, defined three times: the light default on `:root`, dark under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and dark again under `:root[data-theme="dark"]`. Keep the two dark blocks in step.
- `@theme inline` exposes each variable as a Tailwind colour (`bg-background`, `text-foreground`, `text-muted`). A new colour is a new variable in all three blocks plus a line in `@theme inline`.
- **No colour literals in components**: no hex, `oklch()` or Tailwind palette colours like `text-gray-500`. Use the token utilities.
- **No `dark:` variants.** Dark mode is the tokens' job; a colour that differs in dark mode is a token.

## Markup

- Tailwind utilities only. No inline `style` except genuinely dynamic values.
- Readable JSX: hoist nested ternaries and string-building into named consts above the `return`. No value in the markup should take more than a few seconds to understand.
- Semantic elements first (`main`, `h1`, `nav`, `button`); the e2e test finds the page by role (`tests/e2e/home.spec.ts`).
- The layout works at 375px wide (small phone) before anything else.

If `tokens.css` or `app.css` change shape, update this rule.
