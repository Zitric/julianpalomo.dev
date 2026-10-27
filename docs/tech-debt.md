# Tech debt

Shortcuts we've knowingly taken and things we know need fixing. Add a row when
you take a shortcut, and update its status when it's paid off; don't delete
rows, so the history stays visible.

| Item                                                                                                                                                  | Why it matters                                                                                                                | Status                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm-workspace.yaml` lists `wrangler@4.153.0` and a `miniflare` beta under `minimumReleaseAgeExclude`, so they skip pnpm's minimum release age check | That delay protects against freshly published, compromised packages                                                           | Open: remove the exemptions once those versions are older than the delay |
| The Claude Code hook tests (`bash .claude/hooks/tests/run.sh`) run only by hand, not in CI                                                            | A change to a hook can break it without anyone noticing until it fails to block something                                     | Open: add a CI job once the hooks change often enough to need one        |
| Rows in D1's `visitor_messages` are kept after their day ends, though only today's count is ever read                                                 | The table grows by one row per visitor per day, forever                                                                       | Open: delete rows older than today, for example from a scheduled Worker  |
| The D1 binding and `cloudflare:workers` are typed by hand (`src/lib/bot/usage.ts`, `src/cloudflare-workers.d.ts`), not with `wrangler types`          | A D1 method used beyond `prepare`, `bind`, `first` and `run` needs its type written by hand, and a mistake there isn't caught | Open: move to `wrangler types` if more bindings are added                |
