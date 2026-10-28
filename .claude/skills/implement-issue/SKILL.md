---
name: implement-issue
description: Implement a julianpalomo.dev GitHub issue end to end. Reads it with gh, creates its branch, posts the plan on the issue and waits for an OK, implements, runs /handoff and /ship-pr, then acts on the PR's review. Use when asked to implement, build or work on an issue by number.
argument-hint: "[issue-number]"
---

# Implement issue #$ARGUMENTS

GitHub issues are the bridge: the cloud session, which holds the design
context, writes them; this session implements them. Exemplar of a well-formed
issue: #4 (`gh issue view 4`), with numbered sections and a "Done when" list.

## 1. Read

```bash
gh issue view $ARGUMENTS --comments
```

- If it says "Part of #M", read #M too: the epic holds the rules for every sub-issue.
- If it depends on another issue ("after #3"), check that one is closed (`gh issue view 3 --json state`) and its PR merged into `origin/main`. If not, stop and say so.
- The issue, its epic and any review of the PR are decisions: don't ask about them again. **Ask**, before choosing, only when they contradict the code or leave a choice open. Quote the line and say what the code does instead.
- If the issue sets an eval budget, `pnpm eval` runs within it need no permission. Report each run's cost in the PR.

## 2. Branch

```bash
git fetch origin
git switch -c <type>/<short-slug> origin/main
```

`<type>` is `feat`, `fix`, `chore` or `docs`, matching the issue. One issue, one
branch. If the working tree has someone else's changes, leave them and say so;
never stash.

## 3. Plan

Edit nothing yet. Read the files the issue names and every `.claude/rules/*.md`
whose `paths:` match them. The plan lists:

- each file to add or change, and why;
- each choice the issue leaves open, with a recommendation;
- the checks that will prove "Done when", and any that need Julián (a new Claude Code session, Cloudflare, a phone).

Write it to a file in the scratchpad and post it on the issue. The comment is
public: nothing private in it.

```bash
gh issue comment $ARGUMENTS --body-file <file>
```

Plan mode isn't used here: it allows only read-only actions, so it can't post
the comment.

Then wait for an OK from Julián, here or on the issue, or from the cloud review
on the issue (`gh issue view $ARGUMENTS --comments`). Don't poll in a loop:
check when Julián says the review is in. Changes that come with the OK are
decisions; apply them to the plan without asking again. If the work is heavy
(many files, a build, an e2e run), say so in one line before starting.

## 4. Implement

Build what the plan says, nothing more. The hooks format each edit and block
forbidden commands; when one blocks something, change course. Split the work
into commits that each pass `pnpm check` on their own.

## 5. Finish

Run `/handoff`, then `/ship-pr` with `Closes #$ARGUMENTS` (and `Part of #M`).
Never merge.

## 6. Review

When a review lands on the PR, from Julián or the cloud session, read all of it:

```bash
gh pr view <number> --comments
gh api 'repos/{owner}/{repo}/pulls/<number>/comments'
```

The first prints the reviews and the conversation; the second, the comments on
lines. Apply the review on the same branch with new commits through `/handoff`,
then `git push`; the PR updates itself. Don't ask about what the review already
decides. Then reply on the PR with what you didn't apply and why:

```bash
gh pr comment <number> --body-file <file>
```

If the exemplar's shape has changed, update this skill.
