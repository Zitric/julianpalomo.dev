import { defineConfig } from "vitest/config";

// The eval run, which calls the real model and costs money: `pnpm eval` only.
// Standalone on purpose, like vitest.config.ts: never extend vite.config.ts.
// vitest.config.ts includes only tests/unit/, so `pnpm test` and CI's unit
// job never pick up evals/.
export default defineConfig({
  test: {
    include: ["evals/**/*.eval.ts"],
    environment: "node",
    // Cases run four at a time, so a run stays under Anthropic's rate limits.
    maxConcurrency: 4,
  },
});
