#!/usr/bin/env bash
# PostToolUse hook for the edit tools: runs `biome check --write` on the one
# file just edited. Silent on success. When Biome reports something it can't
# fix, exit 2 puts its output in front of Claude (PostToolUse can't undo the
# edit; it only reports).
#
# Biome decides which files it handles (here that includes Markdown and YAML),
# so there is no extension list to keep in step with biome.json.

set -u
. "$(dirname "$0")/lib.sh"

file=$(tool_input_field "$(cat)" file_path) || exit 0
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

repo_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
# Only files inside the repo: biome.json and .gitignore don't apply elsewhere.
case "$file" in
  "$repo_dir"/*) ;;
  *) exit 0 ;;
esac
# Generated or vendored: formatting them only produces churn.
case "$file" in
  */node_modules/* | */dist/* | */routeTree.gen.ts) exit 0 ;;
esac

biome="$repo_dir/node_modules/.bin/biome"
[ -x "$biome" ] || exit 0

if ! out=$(cd "$repo_dir" && "$biome" check --write --no-errors-on-unmatched --files-ignore-unknown=true "$file" 2>&1); then
  printf 'biome check left problems in %s:\n%s\n' "$file" "$out" >&2
  exit 2
fi
exit 0
