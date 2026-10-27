# PR body template

Exemplar: PR #8 (`gh pr view 8`), the app skeleton. Same shape, English only,
no attribution. Read it before writing a body; this file only names the
sections.

- **First line:** `Closes #N.` plus `Part of #M.` when the issue belongs to an epic.
- **`## What`:** one paragraph saying what the PR delivers, then one bullet per area with the lead word in bold (`**Hooks**: …`).
- **`## Decisions worth a look`:** anything a reviewer could reasonably have chosen differently, and why it went this way. This is where the complex parts go.
- **`## Checks`:** every command run locally and its result, then what was not run or not verified and why, then CI's result.

Sections the change doesn't need are left out; don't pad.

If PR #8 stops being the best example of this shape, point this file at a newer
PR.
