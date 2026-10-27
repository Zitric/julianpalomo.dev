import { defineConfig, devices } from "@playwright/test";

const port = 4173;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Runs against a production build served by the Workers runtime, not the dev
  // server. CLOUDFLARE_ENV=e2e builds with wrangler.jsonc's `e2e` environment:
  // the chat answers in demo mode and no local .dev.vars key reaches the build,
  // so a test run never calls the real model.
  webServer: {
    command: `CLOUDFLARE_ENV=e2e pnpm build && pnpm preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
