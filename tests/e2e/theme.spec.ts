import { expect, test } from "@playwright/test";
import { resolveTheme, TWILIGHT_MARGIN_MS } from "../../src/lib/theme";
import { nextTwilight } from "../../src/lib/twilight";

const DAY = 24 * 60 * 60 * 1000;

/** The response's Set-Cookie line for `name`, if it set one. */
function setCookieFor(headers: { name: string; value: string }[], name: string) {
  return headers.find(
    (header) => header.name.toLowerCase() === "set-cookie" && header.value.startsWith(`${name}=`),
  )?.value;
}

// Reads the server's raw HTML, not the hydrated DOM, so these prove the first
// paint is already right.
test.describe("the server's HTML", () => {
  test("has the theme from a choice that hasn't ended", async ({ request }) => {
    const response = await request.get("/", {
      headers: { cookie: `theme=dark.${Date.now() + DAY}` },
    });
    expect(await response.text()).toMatch(/<html[^>]*\sdata-theme="dark"/);
    expect(setCookieFor(response.headersArray(), "theme")).toBeUndefined();
  });

  test("follows Glasgow's sun without a cookie", async ({ request }) => {
    const response = await request.get("/");
    const expected = resolveTheme({ choice: null, now: Date.now() });
    expect(await response.text()).toMatch(new RegExp(`<html[^>]*\\sdata-theme="${expected}"`));
  });

  for (const [what, value] of [
    ["a choice that has ended", () => `dark.${Date.now() - 1000}`],
    ["an old one-year cookie, without an end", () => "dark"],
  ] as const) {
    test(`follows Glasgow's sun with ${what}, and deletes it`, async ({ request }) => {
      const glasgow = resolveTheme({ choice: null, now: Date.now() });
      const other = glasgow === "dark" ? "light" : "dark";
      const stale = value().replace("dark", other);
      const response = await request.get("/", { headers: { cookie: `theme=${stale}` } });
      expect(await response.text()).toMatch(new RegExp(`<html[^>]*\\sdata-theme="${glasgow}"`));
      // The delete carries the path rememberChoice set, or the browser keeps the cookie.
      const deletion = setCookieFor(response.headersArray(), "theme");
      expect(deletion).toMatch(/^theme=;/);
      expect(deletion).toMatch(/Max-Age=0/i);
      expect(deletion).toMatch(/Path=\//i);
    });
  }

  test("is never cached", async ({ request }) => {
    const response = await request.get("/");
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  });
});

test("the toggle chooses the other theme until just after Glasgow's next dusk or dawn", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  const glasgow = resolveTheme({ choice: null, now: Date.now() });
  const other = glasgow === "dark" ? "light" : "dark";
  await expect(html).toHaveAttribute("data-theme", glasgow);
  // Colours don't animate in on load or hydration.
  await expect(html).not.toHaveAttribute("data-theme-change");

  const pressedAt = Date.now();
  await page.getByRole("button", { name: `Switch to ${other} theme` }).click();
  await expect(html).toHaveAttribute("data-theme", other);
  await expect(page.getByRole("button", { name: `Switch to ${glasgow} theme` })).toBeVisible();
  const cookie = (await context.cookies()).find(({ name }) => name === "theme");
  const until = (nextTwilight(pressedAt) ?? 0) + TWILIGHT_MARGIN_MS;
  expect(cookie?.value).toBe(`${other}.${until}`);
  expect(cookie?.path).toBe("/");
  // The browser drops it at the same moment, give or take the second it rounds to.
  expect(Math.abs((cookie?.expires ?? 0) * 1000 - until)).toBeLessThan(2000);

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", other);
});

test("pressing the toggle twice ends the choice and deletes the cookie", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const html = page.locator("html");
  const glasgow = resolveTheme({ choice: null, now: Date.now() });
  const other = glasgow === "dark" ? "light" : "dark";
  await page.getByRole("button", { name: `Switch to ${other} theme` }).click();
  await expect(html).toHaveAttribute("data-theme", other);
  await page.getByRole("button", { name: `Switch to ${glasgow} theme` }).click();
  await expect(html).toHaveAttribute("data-theme", glasgow);
  expect((await context.cookies()).find(({ name }) => name === "theme")).toBeUndefined();

  await page.reload();
  await expect(html).toHaveAttribute("data-theme", glasgow);
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
