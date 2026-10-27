---
paths:
  - "src/content/**"
  - "src/lib/claims.ts"
  - "tests/unit/claims.test.ts"
---

# Claims

Claims are the only facts the assistant may answer from. Why they work this
way is in `docs/adr/2026-10-26-answers-only-from-confirmed-claims.md`; their
shape is the schema in `src/lib/claims.ts`, which is the source of truth.

- **Never set or change `confirmedByJulian`.** Only Julian dates a claim, by hand. A proposed claim goes in with `null`.
- **Never write, reword or improve a claim text.** Take it word for word from the issue. If one looks wrong, ask.
- **A confirmed claim whose text changes goes back to `null`** in the same edit, so Julian confirms it again.
- **Nothing outside `src/lib/claims.ts` reads `claims.json`.** Callers use `confirmedClaims()`, so an unconfirmed claim can't reach the model.
- **No private data**: no phone number, personal email or address, and nothing internal from past employers (ticket or PR numbers, colleagues' names, internal URLs). `tests/unit/claims.test.ts` checks every text and label.
- Claims are personal content, not MIT (`LICENSE`, section 2).

If `src/lib/claims.ts` changes shape, update this rule.
