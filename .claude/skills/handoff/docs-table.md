# Which doc to re-read

Each row names a doc's most common trigger. It is a memory aid for the "does an
existing doc now say something false or incomplete?" test, not a substitute for
it: when a change doesn't obviously fit a row, apply the test directly.

| Doc                                                        | Re-read it when                                                                                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `README.md`                                                | the status, the stack, a command or "The plan" changed. Outsiders read it first, so a stale line here misleads furthest.             |
| `AGENTS.md` (and so `CLAUDE.md`)                           | a hard constraint, the workflow, a command, a folder in "Where things live" or the docs map changed.                                 |
| `.claude/rules/*.md`                                       | code a rule describes changed: a file moved or was renamed (check the rule's `paths:` too), an exemplar it names changed shape.      |
| `.claude/skills/*`, `.claude/hooks/*`, `.claude/README.md` | a procedure, a hook pattern or the setup itself changed. `.claude/README.md` lists every file in `.claude/`.                         |
| `docs/adr/`                                                | a decision was made that shapes the project. Add a new ADR; never rewrite an accepted one. Update the index in `docs/adr/README.md`. |
| `DESIGN.md`, `docs/design/`                                | a colour, font, layout, animation, sound or any other visible behaviour changed. The design is decided there first.                  |
| `docs/tech-debt.md`                                        | a shortcut was taken on purpose, or an existing row was paid off (update its status; don't delete it).                               |

If a doc is added or removed, update this table.
