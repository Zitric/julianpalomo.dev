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

test("the icons, the preview images, the sitemap and robots.txt are served", async ({
  request,
}) => {
  for (const [path, type] of [
    ["/favicon.ico", /^image\/(x-icon|vnd\.microsoft\.icon)/],
    ["/favicon.svg", /^image\/svg\+xml/],
    ["/apple-touch-icon.png", /^image\/png/],
    ["/og/en.png", /^image\/png/],
    ["/og/es.png", /^image\/png/],
    ["/sitemap.xml", /^(application|text)\/xml/],
    ["/robots.txt", /^text\/plain/],
  ] as const) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toMatch(type);
  }
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Sitemap: https://julianpalomo.dev/sitemap.xml",
  );
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("<loc>https://julianpalomo.dev/</loc>");
  expect(sitemap).toContain("<loc>https://julianpalomo.dev/es</loc>");
});

test("the page links its icons", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toMatch(/<link[^>]+rel="icon"[^>]+type="image\/svg\+xml"[^>]+href="\/favicon.svg"/);
  expect(html).toMatch(/<link[^>]+rel="icon"[^>]+href="\/favicon.ico"/);
  expect(html).toMatch(/<link[^>]+rel="apple-touch-icon"[^>]+href="\/apple-touch-icon.png"/);
});
