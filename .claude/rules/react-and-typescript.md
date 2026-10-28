---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# React and TypeScript

React 19, TanStack Start with TanStack Router (file-based routes in
`src/routes/`), TypeScript 7 in strict mode. `tsconfig.json` also turns on
`verbatimModuleSyntax`, `noUncheckedIndexedAccess`, `noUnusedLocals`,
`noUnusedParameters` and `noUncheckedSideEffectImports`. There is no React
Compiler.

## TypeScript

- **Every boundary value starts as `unknown` and is parsed with a Zod schema**: request bodies, server function input, fetch JSON, model output, `localStorage`, environment values. A type annotation is not validation. Zod 4 is installed (`import { z } from "zod"`); `src/lib/claims.ts` is the exemplar, parsing `claims.json` with a strict schema.
- **`import type`** for type-only imports; `verbatimModuleSyntax` fails `tsc` otherwise.
- **`noUncheckedIndexedAccess` is on**: handle the `undefined` from `arr[i]` or `record[key]`; don't cast it away.
- **Discriminated unions over boolean flag pairs**: `{ status: "loading" } | { status: "ready"; data: T }`, not `isLoading` plus `data?`.
- **Exhaustive switches** end in a `never` check, so a new member fails `tsc`: `default: { const unhandled: never = value; throw new Error(String(unhandled)); }`.
- **`as const` or `satisfies`** for config objects, to keep literal types. `src/lib/site.ts` is the exemplar.
- **No `any`** and no non-null `!` without a comment saying why it holds. `src/routeTree.gen.ts` is generated and exempt; never edit it by hand.

## React

- **Follow the Rules of React**: pure render, no mutation of props or state, hooks at the top level.
- **Effects only sync with outside systems** (timers, listeners, the DOM outside React). A value derived from props or state is computed during render; work caused by an event goes in its handler.
- **`ref` is a plain prop** in React 19; don't add `forwardRef`.
- A route file owns its component, like `src/routes/{-$locale}/index.tsx`. Extract a component on its second use or when the file gets hard to scan.
- **Visible strings come from `src/lib/i18n/`**, never inline: text, labels, placeholders, `aria-label`s and alt text. A new string is a key in `en.ts` and `es.ts` (a missing key fails `tsc`), read with `t(useLocale(), key)`.

## TanStack Start and the server

- **Client code reaches the server through `createServerFn`**, never a raw `fetch` to an internal route. The one exception is the chat stream: `useChat` may read it from `/api/chat` (`.claude/rules/bot.md`).
- **A server function that takes input chains `.validator()`** with a Zod schema. That is the method's name in the installed `@tanstack/start-client-core`; check its types before trusting another name from memory or docs for a different version.
- **Secrets, including the Anthropic API key, are read only in server code**: inside a server function handler or a server route. Never in a module a component imports, never in a `VITE_`-prefixed variable (Vite inlines those into the browser bundle), and never returned to the client.

## Errors

- A `catch` handles, rethrows or returns an explicit "couldn't read it" value. A `catch` that deliberately ignores the error says why in a one-line comment.

If an exemplar named here changes shape, update this rule.
