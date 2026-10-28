import { expect, test } from "@playwright/test";
import { resolveTheme } from "../../src/lib/theme";

// Reads the server's raw HTML, not the hydrated DOM, so these prove the first
// paint is already right.
test.describe("the server's HTML", () => {
  test("has the theme from the cookie", async ({ request }) => {
    const response = await request.get("/", { headers: { cookie: "theme=dark" } });
    expect(await response.text()).toMatch(/<html[^>]*\sdata-theme="dark"/);
  });

  test("follows Glasgow's sun without a cookie", async ({ request }) => {
    const response = await request.get("/");
    const expected = resolveTheme({ choice: null, now: Date.now() });
    expect(await response.text()).toMatch(new RegExp(`<html[^>]*\\sdata-theme="${expected}"`));
  });

  test("is never cached", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  });
});

test("the toggle switches the theme, remembers it and says what it does", async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: "theme", value: "light", url: baseURL ?? "" }]);
  await page.goto("/");
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-theme", "light");
  // Colours don't animate in on load or hydration.
  await expect(html).not.toHaveAttribute("data-theme-change");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  const cookie = (await context.cookies()).find(({ name }) => name === "theme");
  expect(cookie?.value).toBe("dark");

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("nothing transitions for longer than 0.3s during a theme change", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /^Switch to (dark|light) theme$/ }).click();

    const { changing, longest } = await page.evaluate(() => {
      const seconds = (value: string) =>
        value.split(",").map((part) => {
          const trimmed = part.trim();
          return trimmed.endsWith("ms")
            ? Number.parseFloat(trimmed) / 1000
            : Number.parseFloat(trimmed);
        });
      const elements = [document.documentElement, ...document.querySelectorAll("*")];
      const durations = elements.flatMap((element) =>
        seconds(getComputedStyle(element).transitionDuration),
      );
      return {
        changing: document.documentElement.hasAttribute("data-theme-change"),
        longest: Math.max(...durations),
      };
    });
    expect(changing).toBe(true);
    expect(longest).toBeLessThanOrEqual(0.3);
  });
});
