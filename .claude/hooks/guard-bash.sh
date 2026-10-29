#!/usr/bin/env bash
# PreToolUse hook for the Bash tool. Blocks (exit 2, reason on stderr) the git
# and GitHub commands AGENTS.md §1 forbids and any command that could write
# src/content/claims.json, and returns an "ask" decision for
# discarding changes, dependency changes and anything wrangler. Everything else exits
# 0 with no output, which leaves the normal permission flow in charge.
#
# The command is split on && || ; | and newlines and each segment is checked on
# its own, so `cd x && git add .` is caught. Attribution is checked on the
# whole command plus any -F / --body-file file it names.
#
# A guard against mistakes, not a security boundary: a command built to dodge
# these patterns will. Test it with .claude/hooks/tests/run.sh.

set -u
. "$(dirname "$0")/lib.sh"

block() {
  printf 'guard-bash blocked this command: %s\n' "$1" >&2
  exit 2
}

input=$(cat)
# Fails closed: without a JSON parser every command would pass unchecked.
cmd=$(tool_input_field "$input" command) ||
  block "the hook can't read its input (no jq or node on PATH), so nothing is checked. Install jq or node."
[ -z "$cmd" ] && exit 0

repo_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"

ask_reason=""
want_ask() { [ -z "$ask_reason" ] && ask_reason="$1"; }

current_branch() { git -C "$repo_dir" rev-parse --abbrev-ref HEAD 2>/dev/null; }
tracked_changes() { git -C "$repo_dir" status --porcelain --untracked-files=no 2>/dev/null; }

# True when an argument of the `git checkout …` in $1 is an existing path.
# Paths resolve against the repo root, not against an earlier `cd` or `git -C`;
# a miss falls through to the branch-switch block, which errs on the safe side.
names_a_path() {
  local a
  set -f
  for a in $(printf '%s' "$1" | sed -E "s/^git +checkout//; s/[\"']//g"); do
    case "$a" in -*) continue ;; esac
    case "$a" in /*) [ -e "$a" ] ;; *) [ -e "$repo_dir/$a" ] ;; esac && {
      set +f
      return 0
    }
  done
  set +f
  return 1
}

# No attribution in a commit or PR: authorship is the repo owner's git config,
# and settings.json's `attribution` keeps Claude Code from adding its own.
# "generated with" must start a word, so "regenerated with" passes. [^a-zA-Z]
# rather than [^a-z]: BSD and GNU grep don't agree on how -i folds brackets.
attribution_re='co-authored-by|(^|[^a-zA-Z])generated with|noreply@anthropic\.com|claude\.com/claude-code|claude\.ai/code/session|🤖'
if printf '%s' "$cmd" | grep -qE '(^|[;&| ])(git( +-C +[^ ]+)* +commit|gh +pr +(create|edit))'; then
  if printf '%s' "$cmd" | grep -qiE "$attribution_re"; then
    block "the commit/PR text contains an attribution line (Co-Authored-By, \"Generated with\", a Claude session link). Commits are authored as the repo owner with no attribution."
  fi
  for f in $(printf '%s' "$cmd" | sed -nE 's/.*(-F|--file|--body-file)[ =]+([^ ;&|]+).*/\2/p'); do
    [ "$f" = "-" ] && continue
    case "$f" in /*) path="$f" ;; *) path="$repo_dir/$f" ;; esac
    if [ -f "$path" ] && grep -qiE "$attribution_re" "$path"; then
      block "$f contains an attribution line. Remove it before committing or opening the PR."
    fi
  done
fi

segments=$(printf '%s\n' "$cmd" | sed -E 's/(&&|\|\||;|\|)/\
/g')

while IFS= read -r raw; do
  seg=$(printf '%s' "$raw" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')
  [ -z "$seg" ] && continue

  # ── Identity ──────────────────────────────────────────────────────────────
  if printf '%s' "$seg" | grep -qE '^git( +-C +[^ ]+)* +-c +user\.'; then
    block "git -c user.* changes commit authorship. Commits use the repo owner's git config as it is."
  fi
  if printf '%s' "$seg" | grep -qE '(^|[[:space:]])GIT_(AUTHOR|COMMITTER)_(NAME|EMAIL)='; then
    block "GIT_AUTHOR_* / GIT_COMMITTER_* change commit authorship. Commits use the repo owner's git config as it is."
  fi
  # Normalise `git -C <dir> <sub>` to `git <sub>`.
  g=$(printf '%s' "$seg" | sed -E 's/^git( +-C +[^ ]+)+ /git /')

  if printf '%s' "$g" | grep -qE '^git +commit( |$).*--author'; then
    block "git commit --author changes authorship. Commits use the repo owner's git config."
  fi
  if printf '%s' "$g" | grep -qE '^git +config( |$).*user\.' &&
    ! printf '%s' "$g" | grep -qE '^git +config +(--get +)?user\.(name|email)$'; then
    block "git config user.* changes authorship. Read it with \`git config user.email\`; never set it."
  fi

  # ── History and the working tree ──────────────────────────────────────────
  case "$g" in
    git\ stash | git\ stash\ *)
      block "git stash (any form) hides work in a place nobody looks. Commit it, or use a git worktree for parallel work." ;;
  esac
  if printf '%s' "$g" | grep -qE '^git +add( +[^ ]+)* +(-A|--all|\.|:/)( |$)'; then
    block "git add -A / --all / . sweeps up unrelated work. Stage files by name."
  fi
  if printf '%s' "$g" | grep -qE '^git +commit( |$).*--amend'; then
    block "git commit --amend rewrites history. Make a new commit."
  fi
  if printf '%s' "$g" | grep -qE '^git +reset( |$).*--hard'; then
    block "git reset --hard discards work."
  fi
  if printf '%s' "$g" | grep -qE '^git +clean( |$).*-[a-zA-Z]*f'; then
    block "git clean -f deletes untracked files, which may be someone's work in progress."
  fi
  if printf '%s' "$g" | grep -qE '^git +rebase( |$)'; then
    block "git rebase rewrites history. Merge origin/main into the branch instead."
  fi
  if printf '%s' "$g" | grep -qE '^git +restore( |$)' &&
    ! printf '%s' "$g" | grep -qE '^git +restore +--staged( +[^-][^ ]*)+$'; then
    want_ask "git restore discards working-tree changes."
  fi
  if printf '%s' "$g" | grep -qE '^git +(checkout|switch)( |$)'; then
    if printf '%s' "$g" | grep -qE '^git +checkout( +[^ ]+)* +(--|\.)( |$)'; then
      want_ask "git checkout -- <path> discards working-tree changes."
    elif printf '%s' "$g" | grep -qE '^git +(checkout +-[bB]|switch +-[cC]|switch +--create)( |$)'; then
      : # Creating a branch keeps the working tree as it is.
    elif printf '%s' "$g" | grep -qE '^git +checkout( |$)' && names_a_path "$g"; then
      want_ask "git checkout <path> discards working-tree changes."
    elif [ -n "$(tracked_changes)" ]; then
      block "switching branches with uncommitted tracked changes. Commit them, or use a git worktree for the other branch."
    fi
  fi

  # ── claims.json ───────────────────────────────────────────────────────────
  # Agents change claims.json only with the edit tools, where guard-claims.sh
  # checks every change. A command that names it may only read or stage it, or
  # mention it in a commit message. 2>&1 and >/dev/null don't write the file;
  # any other > does.
  if printf '%s' "$seg" | grep -qE 'claims\.json'; then
    rest=$(printf '%s' "$g" | sed -E 's/[0-9]*>&[0-9]+//g; s#[0-9]*> */dev/null##g')
    if printf '%s' "$rest" | grep -q '>' ||
      ! printf '%s' "$rest" | grep -qE '^(cat|head|tail|grep|jq|git +(diff|log|show|status|ls-files|add|commit))( |$)'; then
      block "this command names claims.json and could change it. Edit the file with the edit tools, where guard-claims.sh checks the change; in a shell, only read it (cat, head, tail, grep, jq, git diff/log/show) or stage it (git add). Only Julian confirms claims."
    fi
  fi

  # ── Pushing and merging ───────────────────────────────────────────────────
  if printf '%s' "$g" | grep -qE '^git +push( |$)'; then
    if printf '%s' "$g" | grep -qE '(--force|--force-with-lease| -f( |$)| \+[^ ]+)'; then
      block "force-push rewrites remote history."
    fi
    if printf '%s' "$g" | grep -qE '( |:)main( |$)'; then
      block "never push to main. Push the feature branch and open a PR."
    fi
    if [ "$(current_branch)" = "main" ]; then
      block "the current branch is main. Create a feat/, fix/, chore/ or docs/ branch."
    fi
    # A mailbox branch is pushed once, by /mailbox create, and never again: a
    # push would run CI and a preview build, and a delete would close the PR
    # the cloud thread listens on. "Once" means origin's tracking ref doesn't
    # exist yet. A branch named in the command wins; the current branch counts
    # only when the push names none (`git push`, `git push origin`) or HEAD.
    mailbox=$(printf '%s' "$g" | grep -oE 'chore/mailbox-[A-Za-z0-9._-]+' | head -1)
    push_args=$(printf '%s' "$g" | sed -E 's/^git +push//; s/(^| )-[^ ]*//g')
    if [ -z "$mailbox" ] &&
      { [ "$(printf '%s' "$push_args" | wc -w)" -le 1 ] ||
        printf '%s' "$push_args" | grep -qE '(^| )HEAD(:|$| )'; }; then
      case "$(current_branch)" in chore/mailbox-*) mailbox=$(current_branch) ;; esac
    fi
    if [ -n "$mailbox" ] &&
      git -C "$repo_dir" rev-parse --verify -q "refs/remotes/origin/$mailbox" >/dev/null; then
      block "$mailbox is a mailbox, and origin already has it. A mailbox branch never changes after /mailbox create."
    fi
  fi
  if printf '%s' "$seg" | grep -qE '^gh +pr +merge( |$)'; then
    block "PRs are merged by the repo owner, never by an agent (and never with auto-merge)."
  fi
  if printf '%s' "$seg" | grep -qE '^gh +api( |$).*/pulls/[0-9]+/merge|^gh +api( |$).*enablePullRequestAutoMerge'; then
    block "merging or enabling auto-merge through the API is still merging. The repo owner merges."
  fi

  # ── Dependency-changing or Cloudflare commands: ask ───────────────────────
  # Builds and e2e runs pass: they cost nothing, and AGENTS.md §3 says when to
  # run them.
  if printf '%s' "$seg" | grep -qE '^((npx|pnpm( +exec| +dlx)?) +)?([^ ]*/)?wrangler( |$)'; then
    want_ask "wrangler talks to Cloudflare or starts its runtime; ask the repo owner first."
  fi
  if printf '%s' "$seg" | grep -qE '^pnpm( +(-C|--dir|--filter|-F) +[^ ]+| +-[^ ]+)* +(add|install|i|update|up|remove|rm|uninstall)( |$)'; then
    want_ask "this changes dependencies or the lockfile; ask the repo owner first."
  fi
done <<EOF
$segments
EOF

if [ -n "$ask_reason" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"%s"}}\n' \
    "$(json_escape "$ask_reason")"
fi
exit 0
