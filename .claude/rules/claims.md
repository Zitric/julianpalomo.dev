---
paths:
  - "src/content/**"
  - "src/lib/claims.ts"
  - "src/lib/claim-id.ts"
  - "tests/unit/claims.test.ts"
---

# Claims

Claims are the only facts the assistant may answer from. Why they work this
way is in `docs/adr/2026-10-26-answers-only-from-confirmed-claims.md`; their
shape is the schema in `src/lib/claims.ts`, which is the source of truth.

- **Never set or change `confirmedByJulian`.** Only Julian dates a claim, by hand. A proposed claim goes in with `null`.
- `.claude/hooks/guard-claims.sh` enforces this and the reset rule below on every edit to `claims.json`, and `guard-bash.sh` blocks shell commands that could write it. When one blocks, change course; don't look for another way to make the change.
- **Never write, reword or improve a claim text.** Take it word for word from the issue. If one looks wrong, ask.
- **A confirmed claim whose text changes goes back to `null`** in the same edit, so Julian confirms it again.
- **Nothing else in `src/` reads `claims.json`.** Callers use `confirmedClaims()`, so an unconfirmed claim can't reach the model. Only `tests/unit/claims.test.ts` also reads it, to validate every claim, confirmed or not.
- **No private data**: no phone number, personal email or address, and nothing internal from past employers (ticket or PR numbers, colleagues' names, internal URLs). `tests/unit/claims.test.ts` catches email addresses, ticket keys, `#` followed by digits and links outside `formatglasgow.com` and `github.com/Zitric`; `check-invariants.sh` catches UK phone numbers. Nothing catches an address or a colleague's name, so check those yourself.
- Claims are personal content, not MIT (`LICENSE`, section 2).

If `src/lib/claims.ts` changes shape, update this rule.
