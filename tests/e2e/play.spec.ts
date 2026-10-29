import { expect, type Page, test } from "@playwright/test";

// Play with the sky (DESIGN.md section 8). /api/weather is answered here, so
// the live sky is fixed: clear and dry, so any rain on screen is the visitor's.
test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "theme", value: "light", url: baseURL ?? "" }]);
  await page.route("**/api/weather", (route) =>
    route.fulfill({
      json: {
        weather: { clouds: 1, rain: 0, wind: 1, snow: false, haar: false, temperatureC: 11 },
      },
    }),
  );
});

// Exact: the chip's own name ends with "Play with the sky" too.
const gear = (page: Page) => page.getByRole("button", { name: "Play with the sky", exact: true });
const panel = (page: Page) => page.getByRole("dialog", { name: "Play with the sky" });

test("the gear isn't there at first and spins in after 2s", async ({ page }) => {
  await page.goto("/");
  await expect(gear(page)).toHaveCount(0);
  await expect(gear(page)).toBeVisible({ timeout: 4000 });
});

test("the bubble shows on a first visit only", async ({ page }) => {
  await page.goto("/");
  const bubble = page.getByText("Psst… you can change the weather");
  await expect(bubble).toBeVisible({ timeout: 4000 });
  await page.reload();
  await expect(gear(page)).toBeVisible({ timeout: 4000 });
  await expect(bubble).toHaveCount(0);
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
  expect(cookie?.value).toBe("light");
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
  await expect(gear(page)).toBeVisible({ timeout: 4000 });
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
