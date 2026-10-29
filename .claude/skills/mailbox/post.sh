#!/usr/bin/env bash
# Posts one mailbox message, the only way a message reaches a mailbox: the
# fixed first line, then exactly one pointer line. The format lives here and
# nowhere else; the mailbox skill and implement-issue call this script.
#
# It refuses anything but the four pointer forms, and posts only to the PR the
# AGENTS.md table names for <name> when that PR is open, a draft, locked and
# titled "Mailbox: <name> (never merge)". These checks are what make it safe
# to allow without a permission prompt: never loosen them.
#
# On success it prints the comment's URL and its created_at, which is the
# <since> that wait-for-reply.sh takes. --dry-run runs every check, prints the
# body and the target, and posts nothing.
#
# Usage: bash .claude/skills/mailbox/post.sh <name> "<pointer>" [--dry-run]

set -u

fail() {
  printf 'mailbox post: %s\n' "$1" >&2
  exit 1
}

[ $# -ge 2 ] && [ $# -le 3 ] || fail 'usage: post.sh <name> "<pointer>" [--dry-run]'
name=$1
pointer=$2
dry_run=${3:-}
[ -z "$dry_run" ] || [ "$dry_run" = --dry-run ] || fail "the third argument can only be --dry-run"

printf '%s' "$name" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*$' ||
  fail "a mailbox name is lowercase letters, digits and hyphens: '$name'"

# One line, exactly one of the four forms. wc -l counts newlines, so a
# pointer with a second line fails here even if its first line is valid.
[ "$(printf '%s' "$pointer" | wc -l | tr -d ' ')" = 0 ] || fail "the pointer must be one line"
printf '%s' "$pointer" | grep -qE '^(plan: #[0-9]+|ready: PR #[0-9]+|replied: PR #[0-9]+|blocked: #[0-9]+)$' ||
  fail "the pointer must be exactly 'plan: #N', 'ready: PR #N', 'replied: PR #N' or 'blocked: #N': '$pointer'"

# The pointed-at issue or PR must exist, and ready/replied must name a PR.
target=$(printf '%s' "$pointer" | grep -oE '[0-9]+$')
case "$pointer" in
  ready:* | replied:*)
    gh api "repos/{owner}/{repo}/pulls/$target" --jq .number >/dev/null 2>&1 ||
      fail "PR #$target doesn't exist"
    ;;
  *)
    gh api "repos/{owner}/{repo}/issues/$target" --jq .number >/dev/null 2>&1 ||
      fail "#$target doesn't exist"
    ;;
esac

root=$(git rev-parse --show-toplevel 2>/dev/null) || fail "run it inside the repo"
row=$(grep -E "^ *\| *\`$name\` *\|" "$root/AGENTS.md" | head -1)
[ -n "$row" ] || fail "AGENTS.md has no mailbox named '$name'; post nothing and tell Julián"
pr=$(printf '%s' "$row" | cut -d '|' -f 3 | grep -oE '[0-9]+' | head -1)
[ -n "$pr" ] || fail "the AGENTS.md row for '$name' has no PR number"

state=$(gh api "repos/{owner}/{repo}/pulls/$pr" --jq '[.state, .draft, .locked, .title] | @tsv') ||
  fail "can't read PR #$pr"
expected=$(printf 'open\ttrue\ttrue\tMailbox: %s (never merge)' "$name")
[ "$state" = "$expected" ] ||
  fail "PR #$pr isn't the '$name' mailbox (open, draft, locked, titled 'Mailbox: $name (never merge)'); it is: $(printf '%s' "$state" | tr '\t' ' ')"

body=$(printf 'Mailbox from local Claude Code\n%s' "$pointer")
printf 'to PR #%s:\n%s\n' "$pr" "$body"
[ "$dry_run" = --dry-run ] && exit 0

file=$(mktemp "${TMPDIR:-/tmp}/mailbox.XXXXXX")
trap 'rm -f "$file"' EXIT
printf '%s\n' "$body" >"$file"
url=$(gh pr comment "$pr" --body-file "$file") || fail "gh pr comment failed"
id=$(printf '%s' "$url" | grep -oE 'issuecomment-[0-9]+$' | grep -oE '[0-9]+')
created=$(gh api "repos/{owner}/{repo}/issues/comments/$id" --jq .created_at) ||
  fail "posted $url, but can't read its created_at"
printf 'posted %s\ncreated_at %s\n' "$url" "$created"
