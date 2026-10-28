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

// The drawing is 2400 units wide (x −600 to 1800), so a wide screen is bound
// by the hero's height and keeps its sky instead of losing the top.
for (const [sky, orb] of [
  ["autumn,12:00", ".sun .s-disc"],
  ["winter,22:00", ".moon .m-disc"],
] as const) {
  test(`at 1920px the hero still shows the ${orb.includes("sun") ? "sun" : "moon"} (${sky})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/?sky=${sky}`);
    const hero = await page.locator("svg.landscape").boundingBox();
    const disc = await page.locator(`svg.landscape ${orb}`).boundingBox();
    if (!hero || !disc) throw new Error("No hero or no disc");
    expect(disc.y).toBeGreaterThanOrEqual(hero.y);
    expect(disc.y + disc.height).toBeLessThanOrEqual(hero.y + hero.height);
    expect(disc.x).toBeGreaterThanOrEqual(hero.x);
    expect(disc.x + disc.width).toBeLessThanOrEqual(hero.x + hero.width);
  });
}

test("a phone still sees the scene's middle band, about x 329 to 871", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/?sky=summer,15:00");
  const band = await page.locator("svg.landscape").evaluate((svg) => {
    const box = svg.getBoundingClientRect();
    const matrix = (svg as SVGSVGElement).getScreenCTM();
    if (!matrix) throw new Error("No screen matrix");
    const toUser = (screenX: number) => (screenX - matrix.e) / matrix.a;
    return { left: toUser(box.left), right: toUser(box.right) };
  });
  expect(Math.abs(band.left - 329)).toBeLessThanOrEqual(2);
  expect(Math.abs(band.right - 871)).toBeLessThanOrEqual(2);
});
