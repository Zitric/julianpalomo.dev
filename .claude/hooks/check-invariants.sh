#!/usr/bin/env bash
# PostToolUse hook for the edit tools: cheap greps on the file just edited for
# things that must never land in this public repo (AGENTS.md §1). Exit 2 shows
# the reason to Claude; it can't undo the edit, so Claude has to fix the file.
#
# - Anything that looks like an Anthropic API key, in any text file.
# - Anything that looks like a UK phone number, in any text file.
# - Invisible or non-breaking characters in source files (write the escape).
#
# Messages give line numbers only, never the match: echoing a key would put it
# in the transcript. This checks an agent's edits only, not anyone else's.

set -u
. "$(dirname "$0")/lib.sh"

file=$(tool_input_field "$(cat)" file_path) || exit 0
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0
case "$file" in
  */node_modules/* | */dist/* | */.git/*) exit 0 ;;
esac

problems=""
fail() {
  problems="${problems}- $1
"
}

# Line numbers (space-separated) of the lines matching ERE $1; -I skips binaries.
matching_lines() {
  LC_ALL=C grep -nIE -- "$1" "$file" | cut -d: -f1 | tr '\n' ' '
}

# sk-ant- followed by a long key body.
api_key_re='sk-ant-[A-Za-z0-9_-]{20,}'
# International (+44, optionally +44 (0)) or national (leading 0) form, then a
# 1, 2, 3 or 7 and 8 or 9 more digits, with optional spaces or hyphens between
# them. Letters or digits on either side mean it's part of something else (a
# hash). Never write a sample number here: this file is checked too.
uk_phone_re='(^|[^0-9A-Za-z])(\+44 ?(\(0\) ?)?|0)[1-37]([ -]?[0-9]){8,9}([^0-9A-Za-z]|$)'

lines=$(matching_lines "$api_key_re")
[ -n "$lines" ] &&
  fail "line(s) ${lines}look like an Anthropic API key. Keys live only in server-side secrets, never in a file. Remove it, and if it was real, ask the repo owner to revoke it."

lines=$(matching_lines "$uk_phone_re")
[ -n "$lines" ] &&
  fail "line(s) ${lines}look like a UK phone number. No private data in the repo (AGENTS.md §1). Remove it; for a test fixture, build the string at runtime."

case "$file" in
  *.ts | *.tsx | *.js | *.mjs | *.cjs | *.css | *.json | *.jsonc | *.sh | *.yml | *.yaml)
    # U+00A0 nbsp, U+00AD soft hyphen, U+200B-U+200F zero-width and direction
    # marks, U+202A-U+202F bidi controls and narrow nbsp, U+2060 word joiner,
    # U+2066-U+2069 bidi isolates, U+FEFF byte-order mark.
    invisible_re=$'\xc2[\xa0\xad]|\xe2\x80[\x8b-\x8f\xaa-\xaf]|\xe2\x81[\xa0\xa6-\xa9]|\xef\xbb\xbf'
    lines=$(matching_lines "$invisible_re")
    [ -n "$lines" ] &&
      fail "line(s) ${lines}contain a literal invisible or non-breaking character. Write the escape instead (\\u00a0)."
    ;;
esac

if [ -n "$problems" ]; then
  printf 'check-invariants: %s\n%s' "$file" "$problems" >&2
  exit 2
fi
exit 0
