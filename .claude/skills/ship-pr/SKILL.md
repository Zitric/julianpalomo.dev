---
name: ship-pr
description: Push the current julianpalomo.dev branch and open its pull request with `Closes #N`, authored as the repo owner with no attribution, then report CI. Use after /handoff once checks pass. Never merges.
---

# Ship a PR

## 1. Pre-flight: stop if any check fails

```bash
git config --get user.name
git config --get user.email
git log --no-merges --format='%an <%ae>' -5 origin/main
git rev-parse --abbrev-ref HEAD
git status --short
```

- The identity doesn't match the authors on `main` → stop and say so. Never pass `--author`, `-c user.*`, or change `git config`.
- The branch is `main` → stop. Work goes on `feat/…`, `fix/…`, `chore/…` or `docs/…` from an up-to-date `origin/main`.
- Uncommitted task files → `/handoff` first. Unrelated files stay as they are and are mentioned in the report.
- No issue number for `Closes #N` → ask for it.

## 2. Push

```bash
git push -u origin <branch>
```

Never force-push, never push `main`.

## 3. Open the PR

Write the body to a file in the scratchpad, from
[pr-body-template.md](pr-body-template.md), then:

```bash
gh pr create --base main --head <branch> --title "<lowercase imperative, like the commits>" --body-file <file> --assignee @me
```

`@me` is the authenticated `gh` user, so the PR lands in Julián's "Assigned"
list on GitHub.

No attribution anywhere in the title or body. `.claude/settings.json` sets
`attribution` to empty and `guard-bash.sh` blocks one if it slips in.

## 4. Report CI

```bash
gh pr checks <number> --watch
```

`--watch` waits for the seven jobs in `.github/workflows/ci.yml` (check, unit,
knip, hooks, e2e, changes, evals). `evals` shows as skipped on every push: it
runs only when Julian or the cloud reviewer adds the `run-evals` label to a pull
request that touches the bot, and then takes several minutes. On such a pull
request, `changes` writes a notice saying to add the label. Never add the label
yourself; the PR body suggests it. Don't wrap it in
`timeout`, which macOS doesn't have. On a failure,
read the log (`gh run view <run-id> --log-failed`), say what failed, and fix it
on the same branch with a new commit.

## 5. Hand over

Give the PR link and the change summary. **Never merge** and never enable
auto-merge (`guard-bash.sh` blocks both): Julián reviews and merges. If told
it's merged, confirm with `gh pr view <number> --json state,mergedAt` before
building on it.

If the exemplar's shape has changed, update this skill.
