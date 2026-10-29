import { expect, test } from "@playwright/test";

// What a link preview or a search engine reads: the server-rendered HTML,
// before any script runs.

test.describe("the head of each page", () => {
  test.use({ javaScriptEnabled: false });

  for (const [path, locale, canonical] of [
    ["/", "en", "https://julianpalomo.dev/"],
    ["/es", "es", "https://julianpalomo.dev/es"],
  ] as const) {
    test(`${path} carries its own image, canonical and JSON-LD`, async ({ page }) => {
      await page.goto(path);
      const head = page.locator("head");
      await expect(head.locator('meta[property="og:image"]')).toHaveAttribute(
        "content",
        `https://julianpalomo.dev/og/${locale}.png`,
      );
      await expect(head.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
      await expect(head.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical);
      await expect(head.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary_large_image",
      );

      const jsonLd = await head.locator('script[type="application/ld+json"]').textContent();
      const person = JSON.parse(jsonLd ?? "");
      expect(person["@type"]).toBe("Person");
      expect(person.name).toBe("Julian Palomo");
    });
  }
});
