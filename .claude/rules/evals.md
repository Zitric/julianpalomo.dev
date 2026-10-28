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
- A run passes when every critical case passes every time and at least `PASS_RATE` of all runs pass; in CI the rate is only reported ("In CI" below). It stops starting runs past `COST_CAP_MICRO_USD` of estimated cost, and then fails. The per-case tests never fail on their own; `afterAll` fails the command.
- **A provider error makes the run inconclusive, never a pass or a failure of the bot** (`evals/provider-errors.ts`). It is a call to the model API that failed for a reason outside the bot: no credit, a bad key, a rate limit, an overload, a 5xx or a failed connection. `run-case.ts` notices it by wrapping the bot's model (`createBotModel` from `src/lib/bot/model.ts`, the same factory `handleChat` uses) with `wrapLanguageModel` through `handleChat`'s `createModel` override, never with eval code in `src/`. A run that hits one is `provider-error`: out of the pass rate and the critical cases. If any run or calibration item hits one, the verdict is `inconclusive` and the command fails with "N runs hit provider errors: <kinds>". Only the kind is kept, never the provider's message. A malformed request, a model id that doesn't exist or a request that's too large stay failures of the bot, since its code or settings built them. The credit mapping isn't confirmed against a real out-of-credit response yet; correct it from the first one.
- `vitest.evals.config.ts` is standalone and includes only `evals/**/*.eval.ts`. `pnpm test` never runs the evals.

## The judge

- **Claude Sonnet 5.5 at `effort: "medium"`** (`evals/judge.ts`): the bot's model, at a higher effort than the bot's `low`. It is no longer a stronger model than the bot, so the calibration is what shows it still catches subtle overclaims. Never add temperature or sampling settings; its thinking is always adaptive and `effort` is the only control. Changing the model or the effort is Julian's decision.
- It reads every answer the bot gave, after the code checks: each sentence against the full texts of the claims the tools returned (`supported`, `overstated`, `unsupported`, `not_a_claim`), the language and the case's rubric. A run fails on any `overstated` or `unsupported` sentence, the wrong language or an unmet rubric.
- **The judge's split is tidied before anything scores it** (`tidySentences` in `evals/judge.ts`): an empty or whitespace-only sentence is dropped, and a marker-only one (`[[id]]` markers and whitespace) joins the sentence before it, text and claim ids, or is dropped when it comes first. The prompt forbids both and the judge still returns them now and then, as an extra `not_a_claim` that fails a calibration item. Neither states anything, so this can't hide an overclaim; never widen it to drop or merge a sentence with any other text.
- **`evals/judge-prompt.ts` is the only copy of its prompt.** Never ask the judge to show or explain its reasoning: Sonnet 5.5 blocks reasoning extraction. Each sentence gets a one-line reason instead.
- A failure of the judge itself (output that doesn't fit the schema, a safety block, a failed call) is a `judge-error`, counted apart from the bot's failures, never a verdict on the bot. A judge call that fails on a provider error is a provider error instead, and so is one in the calibration: the run is inconclusive, and the judge's prompt isn't to blame.
- **The calibration** (`evals/judge-calibration.ts`) runs before any case, and one wrong item stops the run. An item passes only if the judge returns at least one sentence and every one has the expected verdict. **Never edit an item to make the judge pass**: fix the prompt. Every item that cites a claim is built on a real confirmed claim; one cites none, to calibrate `not_a_claim`.
- After changing the judge's prompt, model or settings, run the calibration alone three times (`EVAL_CALIBRATION_ONLY=1 pnpm eval`) and say in the PR whether any item changed verdict between runs. The results JSON keeps each sentence as the judge split it, after that tidying.

## Cost and the key

- **`pnpm eval` calls the real models and costs money**: about $0.09 for the calibration, which every run starts with, then about $0.01 to $0.02 a case, about two thirds of it the judge. Unit tests and every CI job but `evals` never call them. Every run prints its estimated cost, split into the bot, the judge and the calibration, and the $2 cap counts all three.
- Claude Code may run single cases while developing (`pnpm eval -t <case-id>`), the calibration alone, and one full run before `/handoff`, and reports each run's cost in the PR. Anything more, such as `EVAL_REPEAT` above 1, ask first, unless the issue sets an eval budget: then spend up to it without asking and report the total in the PR.
- The key comes from `.dev.vars` or the environment. It is never printed or logged: the eval file redacts it from all output and from `evals/results/`, which is gitignored.

## In CI

- **When:** the `evals` job in `.github/workflows/ci.yml` runs on every pull request that changes `src/lib/bot/**`, `src/lib/claims.ts`, `src/lib/claim-id.ts`, `src/lib/site.ts`, `src/content/claims.json`, `evals/**`, `vitest.evals.config.ts`, `package.json` or `pnpm-lock.yaml`. On any other pull request it shows as skipped. The same list is in the `changes` job and in `.claude/skills/run-evals/SKILL.md`: keep the three in step. A new file the bot or `evals/` imports from `src/` joins all three (`git grep 'from "\.\./' -- src/lib/bot evals` finds them).
- **What:** `pnpm eval` once (`EVAL_REPEAT=1`), about $0.70 a push. A new push cancels the running job, so only the latest commit spends.
- **The key is Julian's:** the `EVALS_ANTHROPIC_API_KEY` Actions secret, separate from the site's key. Agents never see, set or handle it. Pull requests from forks get no secrets, so there the job says so and passes; never switch the trigger to `pull_request_target`, which would run a fork's code with the key.
- **What fails it:** a critical case, a wrong calibration item, a provider error (inconclusive) or the cost cap. The job sets `EVAL_PASS_RATE=reported`, so a pass rate below `PASS_RATE` shows as a warning in the job summary and as an annotation on the run, instead of failing it (`docs/adr/2026-10-28-evals-in-ci.md`). A local `pnpm eval` always enforces it. Never set `EVAL_PASS_RATE` anywhere else.
- **The results are public.** The job uploads `evals/results/` as the `eval-results` artifact, and the repo is public. It holds the answers and the claims they cite, which are public anyway, and never the key. Never add anything private to the results file.

## Recording runs

- `docs/evals.md` keeps a row for every baseline and every full run after a change to the prompt, the model or its settings: date, commit, bot and judge, repeats, pass rate, critical failures and cost. Add rows; never edit one. Commit a prompt change before running it, so the row names a commit.
- A baseline runs with `EVAL_REPEAT=2` (Julian's decision, 28 Oct); the comparison runs for another model or effort run once.

If `evals/` changes shape, update this rule.
