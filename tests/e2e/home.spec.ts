import { expect, test } from "@playwright/test";

test("the home page renders the name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Julián Palomo" })).toBeVisible();
});
