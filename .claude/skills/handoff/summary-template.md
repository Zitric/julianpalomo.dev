# Change summary template

Julián may paste this, or the PR link, into another chat (the cloud session
reviews the PR), so it has to stand alone. Plain words; no "as discussed". In
English, except the Spanish half of each complex part.

```markdown
## What changed

- `path/to/file.ts`: what changed, and why, in one line.

## Checks

- Ran: `pnpm check` ✓, `pnpm test` ✓ (N tests), …
- Not run: `pnpm test:e2e` (why), `pnpm build` (why), …

## Not verified

- What wasn't checked (a real phone, production, a new Claude Code session), and what was checked instead.

## Review

- `constraint-reviewer`: what it reported ("No findings", or each finding), and what was fixed in which commit.
- `docs-truth-checker`: the same. A finding that stays says why.

## Complex parts

**<name>** (`file.ts:123`)
EN: what it does and why it has to be that way, in plain words.
ES: lo mismo, en español.

## Needs from you

- Anything to run, approve or decide. "Nothing" if nothing.
```

The PR body (`/ship-pr`) reuses "What changed", "Review" and "Complex parts"
in English only.
