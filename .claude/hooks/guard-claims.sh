#!/usr/bin/env bash
# PreToolUse hook for the edit tools. Keeps an agent from confirming a claim
# (AGENTS.md §1). On an edit to src/content/claims.json it works out the file
# as it would be after the edit, and blocks (exit 2, reason on stderr) when:
#
# - the result isn't a JSON array;
# - a claim has a confirmedByJulian date it didn't have under the same id
#   before: a new date, a changed one, or a new or renamed claim that arrives
#   already dated;
# - a claim keeps its date but any other field changes.
#
# Adding claims with null, editing unconfirmed ones, removing a claim and
# setting a date back to null all pass. Julian confirms by hand, outside
# Claude Code, so this never runs for him.
#
# Matches on the end of the path, not the project dir, so a git worktree or a
# copy outside the repo is guarded too. Test it with .claude/hooks/tests/run.sh.

set -u
. "$(dirname "$0")/lib.sh"

block() {
  printf 'guard-claims blocked this edit: %s\n' "$1" >&2
  exit 2
}

input=$(cat)
# Fails closed: without a JSON parser no edit can be checked.
file=$(tool_input_field "$input" file_path) ||
  block "the hook can't read its input (no jq or node on PATH), so nothing is checked. Install jq or node."
case "$file" in
  */src/content/claims.json | src/content/claims.json) ;;
  *) exit 0 ;;
esac
command -v node >/dev/null 2>&1 ||
  block "checking an edit to claims.json needs node, and node isn't on PATH."

# Prints the reason to block, or nothing. Keep single quotes out of the script.
reason=$(printf '%s' "$input" | node -e '
const fs = require("node:fs");

const RESET = "Set its confirmedByJulian back to null in the same edit, so Julian confirms the new version by hand.";
const ONLY_JULIAN = "Only Julian sets confirmedByJulian. Leave it null; he confirms by hand.";

function readFile(path) {
  try {
    return fs.readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

// Mirrors the Edit tool: the first match, or every match with replace_all.
// slice rather than String.replace, which would expand $& in new_string.
// null means the tool itself will refuse the edit.
function applyEdit(text, edit) {
  const from = edit?.old_string;
  const to = edit?.new_string;
  if (typeof from !== "string" || typeof to !== "string") return null;
  if (from === "") return text === null || text === "" ? to : null;
  if (text === null) return null;
  const at = text.indexOf(from);
  if (at === -1) return null;
  if (edit.replace_all === true) return text.split(from).join(to);
  return text.slice(0, at) + to + text.slice(at + from.length);
}

function claimsIn(text) {
  try {
    const value = JSON.parse(text);
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

// JSON with object keys sorted, so key order never counts as a change.
function canonical(value) {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );
}

function check(input) {
  const current = readFile(input.file_path);
  let after;
  if (typeof input.content === "string") {
    after = input.content;
  } else {
    after = current;
    for (const edit of Array.isArray(input.edits) ? input.edits : [input]) {
      after = applyEdit(after, edit);
      if (after === null) return "";
    }
  }

  const claims = claimsIn(after);
  if (claims === null) {
    return "claims.json would no longer be a valid JSON array. Keep it an array of claim objects.";
  }

  // A missing or unreadable file counts as having no claims, the strictest case.
  const before = new Map();
  for (const claim of claimsIn(current ?? "") ?? []) {
    if (typeof claim?.id === "string") before.set(claim.id, claim);
  }

  for (const claim of claims) {
    const date = claim?.confirmedByJulian;
    if (date === null || date === undefined) continue;
    const id = typeof claim.id === "string" ? claim.id : "(no id)";
    const previous = typeof claim.id === "string" ? before.get(claim.id) : undefined;
    if (previous === undefined || canonical(previous.confirmedByJulian) !== canonical(date)) {
      return `claim "${id}" would have a confirmedByJulian date it did not have before (a new date, a changed one, or a new or renamed claim that arrives dated). ${ONLY_JULIAN}`;
    }
    if (canonical(previous) !== canonical(claim)) {
      return `claim "${id}" is confirmed, and this edit changes it but keeps the date. ${RESET}`;
    }
  }
  return "";
}

let raw = "";
process.stdin.on("data", (d) => (raw += d)).on("end", () => {
  process.stdout.write(check(JSON.parse(raw).tool_input ?? {}));
});
') || block "the claims check itself failed, so the edit can't be checked."

[ -n "$reason" ] && block "$reason"
exit 0
