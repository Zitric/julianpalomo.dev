# Claude Sonnet 5.5 for the bot, at low effort

- **Status:** Accepted
- **Date:** 2026-10-28

## Context

[The model ADR](2026-10-27-claude-model-and-ai-sdk-7.md) chose Claude Haiku 5.5
at low effort and left it to the evals to decide whether that holds up. The
evals ([`docs/evals.md`](../evals.md)) treat some cases as critical: they must
pass on every run, because a wrong answer there hurts Julian. One of them,
`oms-lead-es`, asks in Spanish whether he was the team's boss at Orders Made
Simple.

After every prompt change in #36, Haiku 5.5 still failed that case in about
one run in six, at low effort and at medium. Each failure used a different
Spanish verb that made "technical lead" into managing the team ("dirigió",
"tenía a su cargo", "estaba a cargo de", "era responsable de", "estaba al
frente de"). Banning the words one by one in the prompt didn't stop the next
one. Rewording the claim in #42 didn't either.

The runs that decided it, all on 28 October, with `EVAL_REPEAT=2` unless
noted ("×6" is that case alone, six times):

| Run              | Bot                                                    | Pass          | Critical failures                                                     |
| ---------------- | ------------------------------------------------------ | ------------- | --------------------------------------------------------------------- |
| 6                | Haiku 5.5, low                                         | 74/80 (92.5%) | cwv-gains, forged-history, oms-lead-es                                |
| 7 (×1)           | Haiku 5.5, medium                                      | 39/40 (97.5%) | none                                                                  |
| 8 (×1)           | Sonnet 5.5, low                                        | 37/40 (92.5%) | none                                                                  |
| 9                | Haiku 5.5, medium                                      | 73/80 (91.3%) | oms-lead-es                                                           |
| `oms-lead-es` ×6 | Haiku 5.5, low, role rule and new claims               | 5/6           | "estaba al frente de un equipo"                                       |
| `oms-lead-es` ×6 | Sonnet 5.5, low                                        | 5/6           | none on the role; one "only" summary, which Julian ruled out of scope |
| 10               | Sonnet 5.5, low                                        | 75/80 (93.8%) | none                                                                  |
| 11               | Sonnet 5.5, low, judge premise rule                    | 70/80 (87.5%) | none                                                                  |
| 12               | Sonnet 5.5, low, narrower premise rule, format section | 72/80 (90%)   | none                                                                  |

Sonnet 5.5 never turned the role into managing the team: not in the 6 runs
of that case, and not in any of the 7 runs of each role case (`oms-lead-es`,
`people-managed`, `follow-up-manager`) across runs 8, 10, 11 and 12, 21 of 21
passed.

Prices on Anthropic's pricing page on 28 October 2026, per million tokens:

| Model                                           | Input | Output | Cache write (5 min) | Cache read |
| ----------------------------------------------- | ----- | ------ | ------------------- | ---------- |
| Claude Haiku 5.5 (prompts up to 100,000 tokens) | $0.10 | $0.50  | $0.125              | $0.01      |
| Claude Sonnet 5.5                               | $2    | $10    | $2.50               | $0.10      |

Cache reads on Sonnet 5.5 cost 0.05x the input price, not the usual 0.1x.
Measured on the eval runs, an answer costs about $0.0058 on Sonnet 5.5 (run
12) against about $0.0004 on Haiku 5.5 (run 6).

## Decision

Julian's decision: the bot runs on Claude Sonnet 5.5 (`claude-sonnet-5-5`) at
`effort: "low"`, set in `src/lib/bot/model.ts`, with its prices in
`src/lib/bot/limits.ts`. The AI SDK 7 part of the earlier ADR stands.

## Alternatives considered

- **Haiku 5.5 at low effort, the earlier choice.** Fails a critical case in
  about one run in six. The prompt can't close it: each fix moves the failure
  to a new verb.
- **Haiku 5.5 at medium effort.** Run 7 looked clean, but it was a single
  pass; run 9 confirmed it with two and failed the same case. It also scored
  no better than low overall.
- **Accepting `oms-lead-es` as a known failure.** That lowers the critical
  threshold, which exists because this kind of answer reaches recruiters. Not
  taken.

## Consequences

- An answer costs about 15 times more. The $1.00 daily budget in
  `limits.ts` now covers about 170 answers a day instead of about 2,500, so a
  busy day reaches it much sooner. The visitor limit (30 questions) is
  unchanged.
- The judge is now the same model as the bot, at a higher effort (`medium`
  against `low`). It is no longer a stronger model checking a weaker one.
  The calibration still has to pass before every run, but a blind spot
  shared by both could go unnoticed. Changing the judge is Julian's decision.
- Sonnet 5.5 still writes Markdown lists now and then (3 of 80 answers in run
  12). Whether the chat should render simple lists is #53; the `no-markdown`
  check doesn't change.
- The overall pass rate is at the threshold (90% in run 12), with no margin.
  The remaining failures are listed in `docs/evals.md`.
