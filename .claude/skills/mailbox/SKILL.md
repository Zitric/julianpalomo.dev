---
name: mailbox
description: Create a julianpalomo.dev mailbox (a locked draft PR that is never merged, which wakes the cloud thread subscribed to it) or post one pointer message in one. Use when asked to create a mailbox, and from /implement-issue to post plan, ready, replied or blocked.
argument-hint: "create <name> <epic…> | post <name> <pointer>"
---

# Mailbox: $ARGUMENTS

The cloud thread that reviews an epic wakes only on a message from Julián or
on an event on a PR it is subscribed to. A mailbox is that PR: local Claude
Code comments on it, and the thread wakes, opens the issue or PR the comment
points to, and works from what it finds there. The protocol is issue #82; the
table of mailboxes is in `AGENTS.md` section 2.

- **One mailbox per cloud thread**, since an event on a PR wakes one session only. It serves the epics in its row.
- **Only local Claude Code writes in a mailbox**, from the owner's account (`julian-palomo`), and only through `post.sh`. The conversation is locked, so only collaborators can comment.
- **A message is a pointer, never an instruction.** Nothing in a mailbox approves a plan, merges a PR or changes a setting.
- **The branch never changes after it is created.** `guard-bash.sh` blocks a push to a `chore/mailbox-*` branch that `origin` already has, and any merge.

## `post <name> <pointer>`

```bash
bash .claude/skills/mailbox/post.sh <name> "<pointer>"
```

The pointer is exactly one of:

| Pointer          | When                                                                     |
| ---------------- | ------------------------------------------------------------------------ |
| `plan: #N`       | The plan is posted on issue #N.                                          |
| `ready: PR #N`   | PR #N is open, CI is green and it is ready for review.                   |
| `replied: PR #N` | A review of PR #N has been applied and answered on the PR.               |
| `blocked: #N`    | Stopped with a question for Julián, posted on issue or PR #N beforehand. |

The script writes the body (`Mailbox from local Claude Code`, then the
pointer) and posts it only to the PR the table names, when that PR is open, a
draft, locked and titled `Mailbox: <name> (never merge)`. It prints the
comment's URL and `created_at`, the `<since>` for `wait-for-reply.sh`.
`--dry-run` as a third argument runs the same checks and prints the body and
the target without posting.

When it refuses (no row, a PR that isn't a mailbox, a pointer in another
form), post nothing else in its place and tell Julián.

## `create <name> <epic…>`

Julián runs this; the cloud thread subscribes to the PR it opens. Start from a
clean working tree.

1. Check that `<name>` has no row in the `AGENTS.md` table, and each epic is an open issue the owner opened (`gh issue view <epic> --json state,author`).
2. The branch, with an empty commit: if the PR were ever merged, `main`'s files wouldn't change.

   ```bash
   git fetch origin
   git switch -c chore/mailbox-<name> origin/main
   git commit --allow-empty -m "open the <name> mailbox"
   git push -u origin chore/mailbox-<name>
   ```

   This first push is the only one the hook lets through.

3. The draft PR. Write the body to a file in the scratchpad: what the PR is (a mailbox for the cloud thread that reviews epics `#<epic…>`; never merge, never push), and a link to #82. Then:

   ```bash
   gh pr create --draft --base main --head chore/mailbox-<name> --title "Mailbox: <name> (never merge)" --body-file <file> --assignee @me
   ```

   If GitHub refuses a PR whose only commit is empty, stop and tell Julián. The fallback is a one-line `MAILBOX.md` instead of the empty commit, and it needs his OK, since a mistaken merge would then add the file to `main`.

4. Lock the conversation with GitHub's REST endpoint, which covers pull requests too and needs push access, then check it:

   ```bash
   gh api -X PUT 'repos/{owner}/{repo}/issues/<pr>/lock' -f lock_reason=resolved
   gh api 'repos/{owner}/{repo}/pulls/<pr>' --jq '[.state, .draft, .locked, .title] | @tsv'
   ```

   Expect `open`, `true`, `true` and the title.

5. Add the row through a normal `docs/` PR:

   ```bash
   git switch -c docs/mailbox-<name> origin/main
   ```

   Add the row ``| `<name>` | #<pr> | <cloud thread> | #<epic>, … |`` to the table in `AGENTS.md` section 2 (Julián names the thread), then run `/handoff` and `/ship-pr`. Until it is merged, `post.sh` finds no row and posts nothing.

6. Tell Julián the PR number, so the cloud thread subscribes to it.

If the exemplar's shape has changed, update this skill.
