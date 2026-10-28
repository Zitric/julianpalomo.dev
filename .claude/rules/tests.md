---
paths:
  - "tests/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---

# Tests

## Never make `vitest.config.ts` extend `vite.config.ts`

It is standalone on purpose: the `tanstackStart` and `cloudflare` plugins set up
SSR routing and a Workers runtime that conflict with isolated unit tests.

## Unit tests (Vitest)

- Live in `tests/unit/`, matched by `tests/unit/**/*.test.ts`, in the `node` environment. A `.tsx` test or a DOM test needs that `include` and `environment` changed first; it won't run otherwise, and nothing will tell you.
- Exemplar: `tests/unit/site.test.ts`. One `describe` per unit, `it` sentences that read as behaviour ("puts the page first on any other page"), assertions against what the caller sees.
- Import the code under test by relative path (`../../src/lib/site`).
- No snapshot tests for logic.

## End-to-end tests (Playwright)

- Live in `tests/e2e/`. Exemplar: `tests/e2e/home.spec.ts`, which finds elements by role and accessible name.
- They run against a **production build** (`pnpm build && pnpm preview` on port 4173, from `playwright.config.ts`), not the dev server, so they take minutes: ask before running `pnpm test:e2e`. The build uses `wrangler.jsonc`'s `e2e` environment (`CLOUDFLARE_ENV=e2e`), so the chat answers in demo mode and never calls the model (`.claude/rules/bot.md`).
- Tests that open `/` without a `lang` cookie expect English, so they assume the runner isn't in Spain: locally the Workers runtime takes the country from the machine's own connection, and on GitHub's runners it's the US. From Spain, `/` redirects to `/es` and they fail. The country rule is unit-tested in `tests/unit/locale.test.ts` instead, since the local runtime can't set a country per request.
- The `e2e` environment also sets `SCENE_OVERRIDE` (as `previews.vars` does; never at the top level of `wrangler.jsonc`, so production ignores `?sky=`), so `?sky=` (`winter,22:00,clouds=3`) fixes the landscape for a test (`tests/e2e/landscape.spec.ts`). A season moves the date to the 15th of its middle month, so pick the season that gives the sky you test: at 22:00, July is still golden hour.
- Chromium only. CI installs it with `playwright install --with-deps --only-shell chromium`; adding a browser means changing both the config and `ci.yml`.

If an exemplar named here changes shape, update this rule.
