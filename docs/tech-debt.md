# Tech debt

Shortcuts we've knowingly taken and things we know need fixing. Add a row when
you take a shortcut, and update its status when it's paid off; don't delete
rows, so the history stays visible.

| Item                                                                                                                                                  | Why it matters                                                                            | Status                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm-workspace.yaml` lists `wrangler@4.153.0` and a `miniflare` beta under `minimumReleaseAgeExclude`, so they skip pnpm's minimum release age check | That delay protects against freshly published, compromised packages                       | Open: remove the exemptions once those versions are older than the delay |
| The Claude Code hook tests (`bash .claude/hooks/tests/run.sh`) run only by hand, not in CI                                                            | A change to a hook can break it without anyone noticing until it fails to block something | Open: add a CI job once the hooks change often enough to need one        |
| `main` has no branch protection, so nothing requires CI to pass before a merge, and Workers Builds deploys every push to `main`                       | A red PR merged by mistake, or a direct push, goes straight to production                 | Open: require the CI checks on `main` in GitHub's settings               |
