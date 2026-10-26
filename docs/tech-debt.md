# Tech debt

Shortcuts we've knowingly taken and things we know need fixing. Add a row when
you take a shortcut, and update its status when it's paid off; don't delete
rows, so the history stays visible.

| Item | Why it matters | Status |
|---|---|---|
| `pnpm-workspace.yaml` lists `wrangler@4.153.0` and a `miniflare` beta under `minimumReleaseAgeExclude`, so they skip pnpm's minimum release age check | That delay protects against freshly published, compromised packages | Open: remove the exemptions once those versions are older than the delay |
