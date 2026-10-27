#!/usr/bin/env bash
# Runs the hook tests: guard-bash.cases against guard-bash.sh and the
# guard-claims/ fixtures against guard-claims.sh (each once with jq,
# once with the node fallback), plus fixtures for check-invariants.sh and
# format-on-edit.sh. Prints one line per failure and a summary; exits 1 if
# anything failed. Portable between macOS and Linux, like the hooks.
# Usage: bash .claude/hooks/tests/run.sh

set -u

here=$(cd "$(dirname "$0")" && pwd)
hooks=$(cd "$here/.." && pwd)
repo=$(cd "$hooks/../.." && pwd)
. "$hooks/lib.sh"

scratch=$(mktemp -d "${TMPDIR:-/tmp}/hook-tests.XXXXXX")
fmt_dir="$repo/.claude/hooks/tests/.tmp"
trap 'rm -rf "$scratch" "$fmt_dir"' EXIT

pass=0
failures=0
report() { # expected actual label
  if [ "$1" = "$2" ]; then
    pass=$((pass + 1))
  else
    failures=$((failures + 1))
    printf 'FAIL  expected %-5s got %-9s  %s\n' "$1" "$2" "$3"
  fi
}

input_for() { # tool key value
  printf '{"tool_name":"%s","tool_input":{"%s":"%s"}}' "$1" "$2" "$(json_escape "$3")"
}

# ── guard-bash ────────────────────────────────────────────────────────────
make_repo() { # name branch dirty?
  local dir="$scratch/$1"
  git init -q -b "$2" "$dir"
  git -C "$dir" -c user.name=t -c user.email=t@t commit -q --allow-empty -m init
  printf 'a\n' >"$dir/tracked.txt"
  git -C "$dir" add tracked.txt
  git -C "$dir" -c user.name=t -c user.email=t@t commit -q -m tracked
  [ "$3" = dirty ] && printf 'b\n' >>"$dir/tracked.txt"
  return 0
}
make_repo feature-dirty feat/x dirty
make_repo main-clean main clean

verdict_of() { # repo-dir command
  local out code
  out=$(input_for Bash command "$2" |
    CLAUDE_PROJECT_DIR="$1" bash "$hooks/guard-bash.sh" 2>/dev/null)
  code=$?
  if [ "$code" -eq 2 ]; then
    echo block
  elif printf '%s' "$out" | grep -q '"permissionDecision": *"ask"'; then
    echo ask
  elif [ "$code" -eq 0 ] && [ -z "$out" ]; then
    echo pass
  else
    echo "error($code)"
  fi
}

run_cases() { # label
  local current="$scratch/feature-dirty" line expected command
  while IFS= read -r line; do
    case "$line" in '' | \#*) continue ;; esac
    case "$line" in
      @repo\ *)
        current="$scratch/${line#@repo }"
        continue
        ;;
    esac
    expected=$(printf '%s' "${line%%|*}" | tr -d '[:space:]')
    command=$(printf '%s' "${line#*|}" | sed -E 's/^ //')
    report "$expected" "$(verdict_of "$current" "$command")" "guard-bash ($1): $command"
  done <"$here/guard-bash.cases"
}

if command -v jq >/dev/null 2>&1; then
  run_cases jq
else
  printf 'note: jq not found, the jq pass is skipped\n'
fi
HOOK_JSON_PARSER=node run_cases node

# Attribution read from a -F / --body-file file.
printf 'fix x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n' >"$scratch/msg-bad.txt"
printf 'fix x\n' >"$scratch/msg-ok.txt"
printf 'fix x\n\nGenerated with Claude Code\n' >"$scratch/msg-line-start.txt"
report block "$(verdict_of "$scratch/feature-dirty" "git commit -F $scratch/msg-bad.txt")" "guard-bash: commit -F file with attribution"
report block "$(verdict_of "$scratch/feature-dirty" "git commit -F $scratch/msg-line-start.txt")" "guard-bash: commit -F file, attribution at line start"
report pass "$(verdict_of "$scratch/feature-dirty" "git commit -F $scratch/msg-ok.txt")" "guard-bash: commit -F clean file"
report block "$(verdict_of "$scratch/feature-dirty" "gh pr create --body-file $scratch/msg-bad.txt")" "guard-bash: pr --body-file with attribution"

# With neither jq nor node on PATH the hook must fail closed.
nobin="$scratch/nobin"
mkdir -p "$nobin"
for t in cat git sed grep tr cut dirname; do ln -s "$(command -v "$t")" "$nobin/$t"; done
code=$(input_for Bash command "git status" |
  PATH="$nobin" CLAUDE_PROJECT_DIR="$scratch/feature-dirty" "$BASH" "$hooks/guard-bash.sh" >/dev/null 2>&1
  echo $?)
[ "$code" -eq 2 ] && got=block || got="exit$code"
report block "$got" "guard-bash: no jq and no node fails closed"

# ── guard-claims ──────────────────────────────────────────────────────────
# Each fixture in guard-claims/ is a hook input named <verdict>-<case>.json.
# __ROOT__ stands for a scratch tree where base.json is copied to
# src/content/claims.json before every case, so a case can't leak into the next.
claims_root="$scratch/claims-repo"
mkdir -p "$claims_root/src/content"
claims_verdict() { # fixture
  local code
  cp "$here/guard-claims/base.json" "$claims_root/src/content/claims.json"
  sed "s|__ROOT__|$claims_root|g" "$1" | bash "$hooks/guard-claims.sh" >/dev/null 2>&1
  code=$?
  case "$code" in 0) echo pass ;; 2) echo block ;; *) echo "error($code)" ;; esac
}

run_claims_cases() { # label
  local fixture name
  for fixture in "$here"/guard-claims/pass-*.json "$here"/guard-claims/block-*.json; do
    name=$(basename "$fixture" .json)
    report "${name%%-*}" "$(claims_verdict "$fixture")" "guard-claims ($1): $name"
  done
}

if command -v jq >/dev/null 2>&1; then
  run_claims_cases jq
else
  printf 'note: jq not found, the guard-claims jq pass is skipped\n'
fi
HOOK_JSON_PARSER=node run_claims_cases node

# With neither jq nor node, or with jq but no node, an edit to claims.json
# must fail closed. $nobin is the tool-less PATH from the guard-bash section.
claims_input=$(input_for Edit file_path "$claims_root/src/content/claims.json")
code=$(printf '%s' "$claims_input" | PATH="$nobin" "$BASH" "$hooks/guard-claims.sh" >/dev/null 2>&1
  echo $?)
[ "$code" -eq 2 ] && got=block || got="exit$code"
report block "$got" "guard-claims: no jq and no node fails closed"
if command -v jq >/dev/null 2>&1; then
  jqonly="$scratch/jqonly"
  mkdir -p "$jqonly"
  for t in "$nobin"/*; do ln -s "$(readlink "$t")" "$jqonly/$(basename "$t")"; done
  ln -s "$(command -v jq)" "$jqonly/jq"
  code=$(printf '%s' "$claims_input" | PATH="$jqonly" "$BASH" "$hooks/guard-claims.sh" >/dev/null 2>&1
    echo $?)
  [ "$code" -eq 2 ] && got=block || got="exit$code"
  report block "$got" "guard-claims: jq but no node fails closed"
fi

# ── check-invariants ──────────────────────────────────────────────────────
# Fixture text is assembled here at runtime (X → 9, sk_ → sk-) so this file
# never contains a string the hook would flag.
invariant_verdict() { # file
  input_for Edit file_path "$1" | bash "$hooks/check-invariants.sh" >/dev/null 2>&1
  [ $? -eq 2 ] && echo block || echo pass
}
inv_case() { # expected extension content label
  local f="$scratch/inv/case-$((pass + failures)).$2"
  mkdir -p "$scratch/inv"
  printf '%s\n' "$(printf '%s' "$3" | sed -E 's/X/9/g; s/sk_ant/sk-ant/g')" >"$f"
  report "$1" "$(invariant_verdict "$f")" "check-invariants: $4"
}

long_body=$(printf 'a%.0s' 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30)
inv_case block ts "const key = \"sk_ant-api03-$long_body\";" "API key in source"
inv_case block md "ANTHROPIC_API_KEY=sk_ant-api03-$long_body" "API key in markdown"
inv_case pass ts 'const prefix = "sk_ant-";' "bare key prefix"
inv_case block md "Call me on +44 7700 X00123." "UK mobile, international"
inv_case block md "Phone: +44 (0)20 7X46 0X58" "UK landline with (0)"
inv_case block md "Phone: 07700 X00123" "UK mobile, national"
inv_case block md "Phone: 020 7X46 0X58" "UK landline, national"
inv_case block ts 'const tel = "07700X00123";' "UK mobile, no spaces"
inv_case block md "Phone: 07700-X00-123" "UK mobile, hyphens"
inv_case pass md "integrity sha512-ab07700X00123cd" "digits inside a hash"
inv_case pass ts "const timeout = 120_000;" "a numeric literal"
inv_case pass md "Date: 2026-10-26, version 1.170.39" "dates and versions"
inv_case pass md "Order 077009001234567 is not a phone" "a longer digit run"
inv_case block ts "$(printf 'export const a = "x\xc2\xa0y";')" "literal non-breaking space"
inv_case block ts "$(printf 'export const a = "x\xe2\x80\x8by";')" "literal zero-width space"
inv_case block css "$(printf '\xef\xbb\xbf:root {}')" "byte-order mark"
inv_case block ts "$(printf 'const s = "\xe2\x80\xaeevil";')" "bidi override"
inv_case pass ts "$(printf 'export const a = "x%su00a0y";' '\')" "escaped non-breaking space"
inv_case pass md "$(printf 'Julián\xc2\xa0Palomo')" "non-breaking space in markdown"
inv_case pass ts 'export const sep = "·";' "a visible non-ASCII character"

# ── format-on-edit ────────────────────────────────────────────────────────
format_verdict() { # file
  input_for Write file_path "$1" |
    CLAUDE_PROJECT_DIR="$repo" bash "$hooks/format-on-edit.sh" >/dev/null 2>&1
  [ $? -eq 2 ] && echo block || echo pass
}
if [ -x "$repo/node_modules/.bin/biome" ]; then
  mkdir -p "$fmt_dir"
  printf 'export const a   =  1\n' >"$fmt_dir/fixable.ts"
  report pass "$(format_verdict "$fmt_dir/fixable.ts")" "format-on-edit: fixable file is fixed silently"
  grep -q '^export const a = 1;$' "$fmt_dir/fixable.ts" && got=formatted || got=unformatted
  report formatted "$got" "format-on-edit: the .ts file was rewritten"
  printf 'export function f(a: any) { return a == 1 }\n' >"$fmt_dir/unfixable.ts"
  report block "$(format_verdict "$fmt_dir/unfixable.ts")" "format-on-edit: lint error it can't fix"
  printf '# Notes\n\n|a|b|\n|-|-|\n|1|2|\n' >"$fmt_dir/notes.md"
  report pass "$(format_verdict "$fmt_dir/notes.md")" "format-on-edit: markdown is formatted silently"
  grep -q '^| a   | b   |$' "$fmt_dir/notes.md" && got=formatted || got=unformatted
  report formatted "$got" "format-on-edit: the .md table was rewritten"
  # Rules and skills start with YAML frontmatter; without biome.json's
  # markdown.parser.frontmatter, Biome reads the --- lines as rules and breaks it.
  printf -- '---\npaths:\n  - "src/**"\n---\n\n# Rule\n' >"$fmt_dir/rule.md"
  report pass "$(format_verdict "$fmt_dir/rule.md")" "format-on-edit: a rule file passes"
  [ "$(head -4 "$fmt_dir/rule.md" | tr '\n' '|')" = '---|paths:|  - "src/**"|---|' ] && got=kept || got=mangled
  report kept "$got" "format-on-edit: frontmatter survives formatting"
  printf 'echo   hi\n' >"$fmt_dir/script.sh"
  report pass "$(format_verdict "$fmt_dir/script.sh")" "format-on-edit: a file Biome doesn't handle is skipped"
  printf 'export const a   =  1\n' >"$scratch/outside.ts"
  report pass "$(format_verdict "$scratch/outside.ts")" "format-on-edit: a file outside the repo is skipped"
  grep -q 'a   =' "$scratch/outside.ts" && got=untouched || got=rewritten
  report untouched "$got" "format-on-edit: the file outside the repo is untouched"
else
  printf 'note: node_modules/.bin/biome missing (run pnpm install), format-on-edit cases skipped\n'
fi

printf '%d passed, %d failed\n' "$pass" "$failures"
[ "$failures" -eq 0 ]
