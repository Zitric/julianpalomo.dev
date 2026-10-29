import { expect, type Locator, type Page, test } from "@playwright/test";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";

// The page's entrance (DESIGN.md section 11). Every other spec is a later
// visit (playwright.config.ts sets the cookie); these start without it.
test.use({ storageState: { cookies: [], origins: [] } });

const chat = (page: Page) => page.getByRole("region", { name: "Chat" });
const greeting = (page: Page) => chat(page).locator("p").filter({ hasText: en.greeting }).first();
const suggestions = (page: Page, label: string = en.suggestionsLabel) =>
  page.getByRole("list", { name: label });
const cow = (page: Page) => page.getByRole("button", { name: "Pat the cow" });
const hero = (page: Page) => page.locator("svg.landscape");
const playing = (page: Page) => page.locator("[data-entrance]");

/** The opacity that shows on screen: an element's own, times its ancestors'. */
function shownOpacity(locator: Locator): Promise<number> {
  return locator.evaluate((element) => {
    let opacity = 1;
    for (let at: Element | null = element; at; at = at.parentElement) {
      opacity *= Number(getComputedStyle(at).opacity);
    }
    return opacity;
  });
}

async function centre(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("not on screen");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Whether the cow's middle is inside the hero, rather than on the chat's edge below it. */
async function cowInHero(page: Page): Promise<boolean> {
  const { y } = await centre(cow(page));
  const box = await hero(page).boundingBox();
  return box !== null && y < box.y + box.height;
}

test("a first visit introduces the page in order, the chat last", async ({ page }) => {
  await page.goto("/");
  await expect(playing(page)).toHaveAttribute("data-entrance", "full");
  expect(await shownOpacity(greeting(page))).toBe(0);
  expect(await shownOpacity(suggestions(page))).toBe(0);

  // The cow comes in big, in the hero, and says hello there.
  const hello = page.getByText(en.heroCowHello);
  await expect(hello).toBeVisible({ timeout: 5000 });
  await expect(hello).toHaveAttribute("aria-hidden", "true");
  expect(await cowInHero(page)).toBe(true);
  expect(await shownOpacity(greeting(page))).toBe(0);

  // Then it flies to the chat's edge, the greeting types itself out, the
  // suggestions rise, and the entrance is over.
  await expect(playing(page)).toHaveCount(0, { timeout: 10_000 });
  expect(await cowInHero(page)).toBe(false);
  await expect(chat(page).getByText(en.greeting, { exact: true })).toBeVisible();
  expect(await shownOpacity(greeting(page))).toBe(1);
  expect(await shownOpacity(suggestions(page))).toBe(1);
  await expect(hello).toHaveCount(0);
});

test("the greeting shows no word until it starts typing itself out", async ({ page }) => {
  await page.goto("/");
  // Every frame until the entrance is over: how visible the greeting is, and
  // how many of its words are on screen. A MutationObserver would miss a
  // fade; a frame-by-frame sample doesn't.
  const frames = await page.evaluate(
    () =>
      new Promise<{ opacity: number; whole: boolean; words: number }[]>((resolve) => {
        const samples: { opacity: number; whole: boolean; words: number }[] = [];
        const sample = () => {
          const bubble = [...document.querySelectorAll("section p")].find((p) =>
            p.textContent?.includes("Hi! Ask me"),
          );
          if (!document.querySelector("[data-entrance]") || !bubble) return resolve(samples);
          let opacity = 1;
          for (let at: Element | null = bubble; at; at = at.parentElement) {
            opacity *= Number(getComputedStyle(at).opacity);
          }
          const whole = bubble.querySelector(".sr-only") === null;
          samples.push({ opacity, whole, words: bubble.querySelectorAll(".answer-chunk").length });
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }),
  );
  // From the moment it appears until its first word, the bubble is the
  // typing version with nothing typed yet; once it has typed itself out, it's
  // whole again for the entrance's last moments.
  const shown = frames.filter((frame) => frame.opacity > 0);
  const firstWord = shown.findIndex((frame) => frame.words > 0);
  expect(firstWord).toBeGreaterThan(0);
  expect(shown.slice(0, firstWord).every((frame) => !frame.whole && frame.words === 0)).toBe(true);
});

for (const [path, messages] of [
  ["/", en],
  ["/es", es],
] as const) {
  test(`on a 390 × 844 phone the first suggestions show above the composer, at ${path}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await expect(async () => {
      await page.getByRole("heading", { level: 1 }).click();
      await expect(playing(page)).toHaveCount(0, { timeout: 300 });
    }).toPass({ timeout: 2000 });
    const first = await suggestions(page, messages.suggestionsLabel)
      .getByRole("listitem")
      .first()
      .boundingBox();
    const composer = await page
      .locator("form")
      .filter({ has: page.getByLabel(messages.questionLabel) })
      .boundingBox();
    if (!first || !composer) throw new Error("not on screen");
    expect(first.y + first.height).toBeLessThanOrEqual(composer.y);
  });
}

for (const width of [320, 390]) {
  test(`at ${width}px the hero's bubble sits beside the cow, clear of the hero's buttons`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const hello = page.getByText(en.heroCowHello);
    await expect(hello).toBeVisible({ timeout: 5000 });
    const bubble = await hello.boundingBox();
    const scene = await hero(page).boundingBox();
    if (!bubble || !scene) throw new Error("not on screen");
    expect(bubble.x + bubble.width).toBeLessThanOrEqual(scene.x + scene.width);
    expect(bubble.x).toBeGreaterThan(scene.x + scene.width / 2);
    // The tail's tip shows: nothing paints over it. The bubble ignores the
    // pointer, which elementFromPoint honours, so it's turned on to look.
    const tipShows = await hello.evaluate((element) => {
      const tail = element.querySelector("svg");
      if (!tail) return false;
      const box = tail.getBoundingClientRect();
      element.style.pointerEvents = "auto";
      tail.style.pointerEvents = "auto";
      // Inside the triangle, near its tip at (0.75, 15.25) of its 22 × 16.
      const hit = document.elementFromPoint(box.left + 6, box.top + 12.5);
      return hit !== null && element.contains(hit);
    });
    expect(tipShows).toBe(true);
    for (const button of await page.locator("header button").all()) {
      const box = await button.boundingBox();
      if (!box || box.y > bubble.y) continue;
      const apart =
        box.x + box.width <= bubble.x ||
        box.x >= bubble.x + bubble.width ||
        box.y + box.height <= bubble.y;
      expect(apart).toBe(true);
    }
  });
}

test("a tap shows everything at once", async ({ page }) => {
  await page.goto("/");
  // Retried, because a tap before hydration doesn't end it yet.
  await expect(async () => {
    await page.getByRole("heading", { level: 1 }).click();
    await expect(playing(page)).toHaveCount(0, { timeout: 300 });
  }).toPass({ timeout: 2000 });

  expect(await shownOpacity(greeting(page))).toBe(1);
  expect(await shownOpacity(suggestions(page))).toBe(1);
  expect(await shownOpacity(page.getByLabel("Your question"))).toBe(1);
  expect(await shownOpacity(cow(page))).toBe(1);
  expect(await cowInHero(page)).toBe(false);
});

test("a later visit plays the short entrance, with the cow already on the edge", async ({
  page,
}) => {
  await page.goto("/");
  await page.reload();
  await expect(playing(page)).toHaveAttribute("data-entrance", "short");
  expect(await cowInHero(page)).toBe(false);
  // About 1s from the first paint, with room for a busy runner to paint late.
  await expect.poll(() => shownOpacity(greeting(page)), { timeout: 2000 }).toBe(1);
  expect(await cowInHero(page)).toBe(false);
  await expect(page.getByText(en.heroCowHello)).toHaveCount(0);
  await expect(playing(page)).toHaveCount(0, { timeout: 3000 });
});

test("the composer can be reached with the keyboard during the entrance, and shows", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const box = page.getByLabel("Your question");
  // The hero's buttons, the cow and the suggestions come first.
  for (let presses = 0; presses < 15; presses++) {
    await page.keyboard.press("Tab");
    if (await box.evaluate((element) => element === document.activeElement)) break;
  }
  await expect(box).toBeFocused();
  await expect(playing(page)).toHaveCount(0);
  expect(await shownOpacity(box)).toBe(1);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("everything shows at once", async ({ page }) => {
    await page.goto("/");
    expect(await shownOpacity(greeting(page))).toBe(1);
    expect(await shownOpacity(suggestions(page))).toBe(1);
    expect(await shownOpacity(cow(page))).toBe(1);
    expect(await cowInHero(page)).toBe(false);
  });
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("everything ends visible within about 6s, the cow on the chat's edge", async ({ page }) => {
    await page.goto("/");
    expect(await shownOpacity(greeting(page))).toBe(0);
    await expect.poll(() => shownOpacity(cow(page)), { timeout: 7000 }).toBe(1);
    await expect.poll(() => shownOpacity(suggestions(page)), { timeout: 1000 }).toBe(1);
    expect(await shownOpacity(greeting(page))).toBe(1);
    expect(await shownOpacity(page.getByLabel("Your question"))).toBe(1);
    expect(await cowInHero(page)).toBe(false);
  });
});
