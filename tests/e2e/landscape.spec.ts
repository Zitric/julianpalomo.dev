import { expect, test } from "@playwright/test";

// The e2e build sets SCENE_OVERRIDE (wrangler.jsonc's env.e2e), so `?sky=`
// fixes the scene. That `?sky=` is ignored without the variable is unit-tested
// in tests/unit/scene.test.ts, since this build always has it.

for (const season of ["spring", "summer", "autumn", "winter"]) {
  test(`the server renders ${season} from ?sky=`, async ({ request, page }) => {
    const html = await (await request.get(`/?sky=${season},15:00`)).text();
    expect(html).toMatch(new RegExp(`<svg[^>]*class="landscape[^"]*"[^>]*data-season="${season}"`));
    await page.goto(`/?sky=${season},15:00`);
    await expect(page.locator("svg.landscape")).toHaveAttribute("data-season", season);
  });
}

// Winter, not summer: on 15 July at 22:00 Glasgow's sun is still on the
// horizon, in golden hour, with no moon and no stars yet.
test("a winter night at 22:00 shows the moon and the stars, and lights the windows", async ({
  page,
}) => {
  await page.goto("/?sky=winter,22:00");
  const scene = page.locator("svg.landscape");
  await expect(scene.locator(".moon")).toHaveAttribute("data-up", "true");
  await expect(scene.locator(".sun")).toHaveAttribute("data-up", "false");
  const stars = await scene.locator(".stars").evaluate((g) => Number(getComputedStyle(g).opacity));
  expect(stars).toBeGreaterThan(0.9);
  await expect(scene.locator(".cottage .window").first()).toHaveCSS("fill", "rgb(244, 201, 93)");
});

test("a winter day at 13:00 has the sun up and the windows grey", async ({ page }) => {
  await page.goto("/?sky=winter,13:00");
  const scene = page.locator("svg.landscape");
  await expect(scene.locator(".sun")).toHaveAttribute("data-up", "true");
  await expect(scene.locator(".moon")).toHaveAttribute("data-up", "false");
  await expect(scene.locator(".cottage .window").first()).not.toHaveCSS(
    "fill",
    "rgb(244, 201, 93)",
  );
});

test("weather from ?sky= reaches the scene", async ({ page }) => {
  await page.goto("/?sky=autumn,12:00,rain=6,haar,snow");
  const scene = page.locator("svg.landscape");
  await expect(scene).toHaveAttribute("data-haar", "true");
  await expect(scene).toHaveAttribute("data-snowy", "true");
  const ripples = await scene
    .locator(".ripples")
    .evaluate((g) => Number(getComputedStyle(g).opacity));
  expect(ripples).toBeCloseTo(0.7, 1);
});

test("the hero keeps its height and stays behind the controls", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "theme", value: "light", url: baseURL ?? "" }]);
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/?sky=summer,15:00");
  const hero = page.locator("svg.landscape");
  await expect(hero).toHaveCSS("pointer-events", "none");
  expect((await hero.boundingBox())?.height).toBe(230);
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("toggling the theme runs the landscape's sunset", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "theme", value: "light", url: baseURL ?? "" }]);
  await page.goto("/");
  const scene = page.locator("svg.landscape");
  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(scene).toHaveAttribute("data-choreography", "sunset");
  await expect(scene).not.toHaveAttribute("data-choreography", /.*/, { timeout: 3000 });
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing in the hero animates", async ({ page }) => {
    await page.goto("/?sky=winter,22:00,clouds=1,rain=2,wind=8,haar");
    const running = await page
      .locator("svg.landscape")
      .evaluate((svg) => svg.getAnimations({ subtree: true }).length);
    expect(running).toBe(0);
  });
});
