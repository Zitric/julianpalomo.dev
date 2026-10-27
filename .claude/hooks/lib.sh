#!/usr/bin/env bash
# Shared helpers for the hooks, sourced, never run on its own.
#
# Portable on purpose: the hooks run on Julián's Mac (BSD sed/grep, jq in
# /usr/bin) and in Claude Code's cloud sessions (Linux, GNU tools, jq not
# guaranteed). Use only `sed -E`, `grep -E` and POSIX options here; never
# `sed -i`, `grep -P` or `timeout`.

# Prints the string field `$2` of `.tool_input` from the hook's JSON input `$1`,
# or nothing. Uses jq when present and node otherwise (node is always there in
# this repo). HOOK_JSON_PARSER=node forces the node path, for the tests.
tool_input_field() {
  if [ "${HOOK_JSON_PARSER:-}" != node ] && command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -r --arg k "$2" '.tool_input[$k] // empty | strings'
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$1" | node -e '
      let s = "";
      process.stdin.on("data", (d) => (s += d)).on("end", () => {
        const v = JSON.parse(s)?.tool_input?.[process.argv[1]];
        if (typeof v === "string") process.stdout.write(v);
      });
    ' "$2"
  else
    return 1
  fi
}

# Escapes `$1` for use inside a JSON string literal.
json_escape() {
  printf '%s' "$1" | sed -E 's/\\/\\\\/g; s/"/\\"/g' | tr '\t\n' '  '
}
