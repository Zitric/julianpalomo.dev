import { expect, type Locator, type Page, test } from "@playwright/test";

// Play with the sky (DESIGN.md section 8). /api/weather is answered here, so
// the live sky is fixed: clear and dry, so any rain on screen is the visitor's.
// A light theme choice that lasts a day: the cookie holds its end (src/lib/theme.ts).
const LIGHT_FOR_A_DAY = `light.${Date.now() + 24 * 60 * 60 * 1000}`;

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "theme", value: LIGHT_FOR_A_DAY, url: baseURL ?? "" }]);
  await page.route("**/api/weather", (route) =>
    route.fulfill({
      json: {
        weather: { clouds: 1, rain: 0, wind: 1, snow: false, haar: false, temperatureC: 11 },
      },
    }),
  );
});

/**
 * Whether the bubble's tail shows at a point inside it, near its tip: nothing
 * paints over it. The bubble ignores the pointer, which elementFromPoint
 * honours, so it's turned on to look.
 */
function tailShows(bubble: Locator, x: number, y: number): Promise<boolean> {
  return bubble.evaluate(
    (element, at) => {
      const tail = element.querySelector("svg");
      if (!(element instanceof HTMLElement) || !tail) return false;
      const box = tail.getBoundingClientRect();
      element.style.pointerEvents = "auto";
      tail.style.pointerEvents = "auto";
      const hit = document.elementFromPoint(box.left + at.x, box.top + at.y);
      return hit !== null && element.contains(hit);
    },
    { x, y },
  );
}

// The gear spins in 2s after the entrance; these tests get the short one, about 2s.
const GEAR_WAIT = 6000;

// Exact: the chip's own name ends with "Play with the sky" too.
const gear = (page: Page) => page.getByRole("button", { name: "Play with the sky", exact: true });
const panel = (page: Page) => page.getByRole("dialog", { name: "Play with the sky" });

test("the gear isn't there at first and spins in 2s after the entrance", async ({ page }) => {
  await page.goto("/");
  await expect(gear(page)).toHaveCount(0);
  await expect(gear(page)).toBeVisible({ timeout: GEAR_WAIT });
});

test("the bubble shows on a first visit only", async ({ page }) => {
  await page.goto("/");
  const bubble = page.getByText("Psst… you can change the weather");
  await expect(bubble).toBeVisible({ timeout: GEAR_WAIT });
  // Its tail, 14 × 9, points up at the gear from (7, 0.75).
  expect(await tailShows(bubble, 7, 3)).toBe(true);
  await page.reload();
  await expect(gear(page)).toBeVisible({ timeout: GEAR_WAIT });
  await expect(bubble).toHaveCount(0);
});

test("opening and closing the panel leaves the live sky, the live chip and the theme cookie", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await gear(page).click();
  await expect(panel(page)).toBeVisible();
  // The controls show the live sky, but nothing plays until one changes.
  await expect(panel(page).getByLabel("Rain", { exact: true })).toHaveValue("0");
  await expect(page.getByRole("button", { name: /^Weather in Glasgow:/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(page.getByRole("button", { name: /^Weather in Glasgow:/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Your sky/ })).toHaveCount(0);
  const cookie = (await context.cookies()).find(({ name }) => name === "theme");
  expect(cookie?.value).toBe(LIGHT_FOR_A_DAY);
});

test("the first change in the panel starts playing", async ({ page }) => {
  await page.goto("/");
  await gear(page).click();
  await expect(page.getByRole("button", { name: /^Your sky/ })).toHaveCount(0);
  await panel(page).getByLabel("Clouds").fill("4");
  await expect(
    page.getByRole("button", { name: /^Your sky, \d{2}:00\. Back to live Glasgow$/ }),
  ).toBeVisible();
});

test("rain to 8 rains on the landscape and the chip says it's the visitor's sky", async ({
  page,
}) => {
  await page.goto("/");
  await gear(page).click();
  await expect(panel(page)).toBeVisible();
  await panel(page).getByLabel("Rain", { exact: true }).fill("8");
  await expect(page.locator(".particle.rain")).toHaveCount(80);
  await page.keyboard.press("Escape");
  const chip = page.getByRole("button", { name: /^Your sky, \d{2}:00\. Back to live Glasgow$/ });
  await expect(chip).toContainText("Your sky");
  await chip.click();
  await expect(page.locator(".particle.rain")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Weather in Glasgow: 11°C, clear\./ }),
  ).toBeVisible();
});

test("Back to live Glasgow restores the live sky and the chip", async ({ page }) => {
  await page.goto("/");
  await gear(page).click();
  await panel(page).getByLabel("Rain", { exact: true }).fill("6");
  await panel(page).getByRole("button", { name: "Back to live Glasgow" }).click();
  await expect(panel(page)).toBeHidden();
  await expect(page.locator(".particle.rain")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Weather in Glasgow:/ })).toBeVisible();
});

test("22:00 makes the page dark, and a reload brings back the real theme", async ({
  page,
  context,
}) => {
  await page.goto("/?sky=autumn,12:00");
  await gear(page).click();
  await panel(page).getByLabel("Time of day").fill("22");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const cookie = (await context.cookies()).find(({ name }) => name === "theme");
  expect(cookie?.value).toBe(LIGHT_FOR_A_DAY);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("Escape closes the panel and gives focus back to the gear", async ({ page }) => {
  await page.goto("/");
  await gear(page).click();
  await expect(panel(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(gear(page)).toBeFocused();
});

test("the whole panel works with the keyboard alone", async ({ page }) => {
  await page.goto("/");
  await expect(gear(page)).toBeVisible({ timeout: GEAR_WAIT });
  await gear(page).focus();
  await page.keyboard.press("Enter");
  await expect(panel(page)).toBeVisible();
  // Focus starts inside: Close, then the seasons, then each slider.
  await expect(panel(page).getByRole("button", { name: "Close" })).toBeFocused();
  await page.keyboard.press("Tab");
  const checked = panel(page).getByRole("radio", { checked: true });
  await expect(checked).toBeFocused();
  const before = await checked.getAttribute("value");
  await page.keyboard.press("ArrowRight");
  await expect(checked).not.toHaveAttribute("value", before ?? "");
  await page.keyboard.press("Tab");
  await expect(panel(page).getByLabel("Time of day")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(panel(page).getByLabel("Clouds")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const snow = panel(page).getByRole("switch", { name: "Snow instead of rain" });
  await expect(snow).toBeFocused();
  await page.keyboard.press("Space");
  await expect(snow).toHaveAttribute("aria-checked", "true");
  await expect(panel(page).getByLabel("Snow", { exact: true })).toBeVisible();
  // Focus stays inside the panel.
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  await expect(panel(page).locator(":focus")).toHaveCount(1);
});

// The sheet's controls scroll; "Back to live Glasgow" stays in view at its foot.
for (const height of [844, 664]) {
  test(`on a 390 × ${height} phone the way back is always in view`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height });
    await page.goto("/");
    await gear(page).click();
    const back = panel(page).getByRole("button", { name: "Back to live Glasgow" });
    await expect(back).toBeInViewport({ ratio: 1 });
    await panel(page).getByLabel("Wind").focus();
    await expect(back).toBeInViewport({ ratio: 1 });
    const hero = await page.locator("svg.landscape").boundingBox();
    const sheet = await panel(page).boundingBox();
    expect((sheet?.y ?? 0) >= (hero?.y ?? 0) + (hero?.height ?? 0)).toBe(true);
  });
}
