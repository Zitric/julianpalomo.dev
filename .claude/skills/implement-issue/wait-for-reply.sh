#!/usr/bin/env bash
# Waits, bounded, for the owner's reply on an issue or PR: every 2 minutes, for
# up to 60, it looks for a comment (on a PR also a review or a line comment)
# that was created after <since>, whose author association is OWNER and whose
# first line isn't one of Claude Code's three fixed ones. Anyone else's comment
# is skipped, even when it is the only new one: the repo is public. Match the
# owner by association, never by login: a renamed account keeps OWNER.
#
# Exit 0 prints "<time> <url>" for each reply found. A reply isn't an OK: the
# skill reads it and acts on it. Exit 1 means the time ran out; exit 2, bad
# arguments. A failed gh call counts as no reply, so a network blip doesn't end
# the wait early.
#
# Run it as one background Bash command with a timeout above the limit
# (3900000 ms), since unattended sessions stop background commands after 30
# minutes by default. WAIT_INTERVAL and WAIT_LIMIT (seconds) are for tests.
#
# Usage: bash .claude/skills/implement-issue/wait-for-reply.sh <issue|pr> <number> <since>

set -u

usage() {
  printf 'usage: wait-for-reply.sh <issue|pr> <number> <since, like 2026-10-29T13:08:22Z>\n' >&2
  exit 2
}

[ $# -eq 3 ] || usage
kind=$1
number=$2
since=$3
case "$kind" in issue | pr) ;; *) usage ;; esac
printf '%s' "$number" | grep -qE '^[0-9]+$' || usage
printf '%s' "$since" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$' || usage

interval=${WAIT_INTERVAL:-120}
limit=${WAIT_LIMIT:-3600}

# ISO 8601 UTC timestamps compare correctly as strings.
select_replies() { # time-field
  printf '.[] | select(.author_association == "OWNER" and (.%s // "") > "%s" and ((.body // "") | test("^(Plan|Reply|Mailbox) from local Claude Code") | not)) | "\\(.%s) \\(.html_url)"' \
    "$1" "$since" "$1"
}

replies() {
  gh api --paginate "repos/{owner}/{repo}/issues/$number/comments" --jq "$(select_replies created_at)" 2>/dev/null
  if [ "$kind" = pr ]; then
    gh api --paginate "repos/{owner}/{repo}/pulls/$number/reviews" --jq "$(select_replies submitted_at)" 2>/dev/null
    gh api --paginate "repos/{owner}/{repo}/pulls/$number/comments" --jq "$(select_replies created_at)" 2>/dev/null
  fi
  return 0
}

elapsed=0
while :; do
  found=$(replies)
  if [ -n "$found" ]; then
    printf '%s\n' "$found" | sort
    exit 0
  fi
  if [ "$elapsed" -ge "$limit" ]; then
    printf 'no reply from the owner on %s #%s after %s seconds\n' "$kind" "$number" "$elapsed"
    exit 1
  fi
  sleep "$interval"
  elapsed=$((elapsed + interval))
done
