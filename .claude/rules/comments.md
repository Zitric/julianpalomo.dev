---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
  - "**/*.css"
  - "**/*.sh"
  - ".github/workflows/**"
---

# Comment register

A comment states a **present-tense fact about the code**, not an event that
happened to it. History lives in git, `docs/adr/` and `docs/tech-debt.md`,
which carry it better and don't rot. Comments are in English.

**Never write into a comment:**

- PR, issue or review references: `(PR 8)`, `see #4`, `post-review fix`.
- Dates and dated verification: `(2026-10-26)`, `checked against the docs today`.
- Before/after narration: "used to", "was 40px before".
- Internal shorthand with no content: `M1`, `step 3b`, `phase 2`.
- Feature-provenance tags ("added for the bot"). Code gets reused; the tag doesn't follow, and ends up wrong.
- Speculative future work: "the bot will replace this".
- AI or tool attribution of any kind.

**The rewrite rule.** "Review found X was wrong, so we now do Y" becomes "Y,
because X would otherwise happen." Prefer imperatives for traps: _never extend
this config_, _keep these two in step_.

**Always keep:**

- Anything that stops a plausible wrong edit: "don't remove this", "deliberately not", and the failure that follows if someone changes it. `vitest.config.ts`'s "Standalone on purpose" header is the exemplar.
- Concrete specifics: numbers, sizes, versions. Specificity is the point.
- File headers that orient a reader to a module's purpose, like the one in `src/styles/tokens.css`.
- Pointers into `docs/adr/` or `docs/tech-debt.md`. Check the target exists first; a pointer to nothing is worse than none.

**Proportionality.** Comment length scales with how easy the line is to break.
A guard with a silent failure mode earns a paragraph; a formatter doesn't.
Never restate what the code plainly says, and never quote another file's source
in a comment: that copy rots.

If the exemplars named here change shape, update this rule.
