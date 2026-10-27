import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

// Everything under dist/client is served to browsers. playwright.config.ts
// builds before the tests run, unless a local server is being reused, in which
// case this reads whatever the last build left.
const clientDir = "dist/client";

/** Strings that must never reach the browser: the key's name, and the claims file. */
const forbidden = ["ANTHROPIC_API_KEY", "confirmedByJulian"];

test("the browser bundle holds no server secret and no claims data", async () => {
  const entries = await readdir(clientDir, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile());
  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    const path = join(file.parentPath, file.name);
    const content = await readFile(path, "utf8");
    for (const needle of forbidden) {
      expect(content.includes(needle), `${needle} in ${path}`).toBe(false);
    }
  }
});
