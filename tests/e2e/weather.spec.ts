import { expect, type Page, test } from "@playwright/test";
import type { WeatherBody } from "../../src/lib/weather/weather";

// /api/weather is answered here, never by Open-Meteo. Without ?sky= the scene
// is today's real season, so leaves, petals, midges or glints may fall on any
// of these: the checks look at the kinds the weather brings, not the total.

async function answerWeather(page: Page, body: WeatherBody | "fail") {
  await page.route("**/api/weather", (route) =>
    body === "fail" ? route.abort() : route.fulfill({ json: body }),
  );
}

// The chip hides part of its text by width, so its checks read only what shows.
const chip = (page: Page) =>
  page
    .locator("header button")
    .filter({ hasText: /\d{2}:\d{2}/ })
    .first();

test("rain 8 reaches the chip and the sky", async ({ page }) => {
  await answerWeather(page, {
    weather: { clouds: 5, rain: 8, wind: 2, snow: false, haar: false, temperatureC: 9 },
  });
  await page.goto("/");
  await expect(chip(page)).toHaveText(/^Glasgow · \d{2}:\d{2} · 9°C · Heavy rain$/, {
    useInnerText: true,
  });
  await expect(page.locator(".particle.rain")).toHaveCount(80);
  await expect(page.locator(".particle.snow")).toHaveCount(0);
});

test("snow reaches the chip and falls as snowflakes", async ({ page }) => {
  await answerWeather(page, {
    weather: { clouds: 7, rain: 3, wind: 1, snow: true, haar: false, temperatureC: -1 },
  });
  await page.goto("/");
  await expect(chip(page)).toContainText("-1°C · Snow", { useInnerText: true });
  await expect(page.locator(".particle.snow")).toHaveCount(24);
  await expect(page.locator(".particle.rain")).toHaveCount(0);
});

test("on a phone the chip leaves out the place and the time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await answerWeather(page, {
    weather: { clouds: 2, rain: 0, wind: 1, snow: false, haar: false, temperatureC: 12 },
  });
  await page.goto("/");
  await expect(chip(page)).toHaveText("12°C · A few clouds", { useInnerText: true });
});

test("a failure leaves a clear sky and only the time in the chip", async ({ page }) => {
  await answerWeather(page, "fail");
  await page.goto("/");
  await expect(chip(page)).toHaveText(/^Glasgow · \d{2}:\d{2}$/, { useInnerText: true });
  await expect(page.locator(".particle.rain")).toHaveCount(0);
  await expect(page.locator(".particle.snow")).toHaveCount(0);
  for (const layer of [".greyout", ".greyout2"]) {
    const opacity = await page
      .locator(`svg.landscape ${layer}`)
      .evaluate((rect) => Number(getComputedStyle(rect).opacity));
    expect(opacity).toBe(0);
  }
});

test("?sky= is a fixed scene and doesn't ask for the weather", async ({ page }) => {
  let asked = false;
  await page.route("**/api/weather", (route) => {
    asked = true;
    return route.fulfill({ json: { weather: null } });
  });
  await page.goto("/?sky=autumn,12:00");
  await expect(page.locator("svg.landscape")).toHaveAttribute("data-season", "autumn");
  await page.waitForLoadState("networkidle");
  expect(asked).toBe(false);
});

test("the footer credits Open-Meteo", async ({ page }) => {
  await answerWeather(page, { weather: null });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open-Meteo.com" })).toHaveAttribute(
    "href",
    "https://open-meteo.com/",
  );
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("no particles show", async ({ page }) => {
    await answerWeather(page, {
      weather: { clouds: 8, rain: 8, wind: 6, snow: false, haar: false, temperatureC: 7 },
    });
    await page.goto("/");
    await expect(chip(page)).toContainText("Heavy rain", { useInnerText: true });
    await expect(page.locator(".particles")).toBeHidden();
  });
});
