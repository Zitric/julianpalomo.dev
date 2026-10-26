import { defineConfig } from "vitest/config";

// Standalone on purpose: never extend vite.config.ts. The tanstackStart and
// cloudflare plugins set up SSR routing and a Workers runtime that conflict
// with isolated unit tests.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
