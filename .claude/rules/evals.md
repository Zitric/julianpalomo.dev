---
paths:
  - "evals/**"
  - "vitest.evals.config.ts"
  - "tests/unit/eval-*.test.ts"
  - "src/lib/bot/prompt.ts"
  - "src/lib/bot/model.ts"
  - "src/lib/bot/tools.ts"
  - "src/lib/bot/chat.ts"
  - "src/lib/bot/citations.ts"
  - "src/content/claims.json"
  - "src/lib/claims.ts"
---

# Evals

The evals ask the real assistant a set of cases and grade the answers. They
exist because of `docs/adr/2026-10-26-answers-only-from-confirmed-claims.md`:
the bot talks about a real person, and a confident wrong answer is worse than
"I don't know". Changing the prompt, the tools, the model, its settings or a
claim changes the answers, so this rule loads for those files too.

## The rules for every case

- **No private data in a case**, and nothing Julian hasn't stated: no phone number, email or address, no colleagues' names, nothing internal from past employers.
- **A case's expectations come only from `src/content/claims.json`**: what a claim says, or that no claim covers the question. A trap may ask about something false ("Did Julian mentor engineers at Cazoo?"), but a case never states a fact about Julian that isn't in a claim. The one exception is a fixed earlier answer in an injection case, which is false on purpose and says so. `loadCases()` rejects a cited id that isn't a confirmed claim.
- **Never weaken a case, a check or a threshold to make a run pass.** A failing case is a finding: fix the prompt, the tools or the settings, or bring it to Julian. Changing a case's expectations, `PASS_RATE` or `COST_CAP_MICRO_USD` (both in `evals/report.ts`) needs Julian's OK in the PR.
- A regex can't tell "he mentored at Cazoo" from "he didn't mentor at Cazoo". `mustNotMatch` is only for text that must never appear in any form; meaning is the judge's job.

## How a run works

- `evals/run-case.ts` calls `handleChat`, the production endpoint, with a request shaped like `useChat`'s, so the validation, tools, prompt, citation check and limits all run as in production. It uses only `handleChat`'s existing overrides: an in-memory store per run of each case, so the daily limits never cut an eval run, and a `waitUntil` that it awaits. **Never add a code path for evals in `src/`.**
- The response is read with the SDK's own readers: `parseJsonEventStream` with `uiMessageChunkSchema`, then `readUIMessageStream`.
- `evals/checks.ts` holds the code checks as pure functions. A response that isn't 200 fails on its status alone, never as an empty answer. Every check has a passing and a failing unit test in `tests/unit/eval-checks.test.ts`.
- A run passes when every critical case passes every time and at least `PASS_RATE` of all runs pass. It stops starting runs past `COST_CAP_MICRO_USD` of estimated cost, and then fails. The per-case tests never fail on their own; `afterAll` fails the command.
- `vitest.evals.config.ts` is standalone and includes only `evals/**/*.eval.ts`. `pnpm test` never runs the evals.

## Cost and the key

- **`pnpm eval` calls the real model and costs money** (about $0.001 a case). Unit tests and CI's existing jobs never call it. Every run prints its estimated cost.
- Claude Code may run single cases while developing (`pnpm eval -t <case-id>`) and one full run before `/handoff`, and reports each run's cost in the PR. Anything more, such as `EVAL_REPEAT` above 1, ask first.
- The key comes from `.dev.vars` or the environment. It is never printed or logged: the eval file redacts it from all output and from `evals/results/`, which is gitignored.

If `evals/` changes shape, update this rule.
