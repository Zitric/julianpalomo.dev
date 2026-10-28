import { expect, test } from "@playwright/test";

test("the home page renders the name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Julian Palomo" })).toBeVisible();
});

test("the portrait has its alt text", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("img", { name: "Pixel-art portrait of Julian Palomo" }),
  ).toBeVisible();
});

for (const width of [320, 1440]) {
  test(`the page doesn't scroll sideways at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test("the preloaded fonts are the files the stylesheet uses", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const preloaded = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  expect(preloaded).toHaveLength(2);

  // A preload the stylesheet doesn't use makes the browser download a second
  // file: exactly two font files load, and they are the preloaded ones.
  const loaded = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .filter((name) => name.endsWith(".woff2")),
  );
  expect(new Set(loaded)).toEqual(new Set(preloaded));
});
