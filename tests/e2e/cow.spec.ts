import { expect, type Locator, type Page, test } from "@playwright/test";
import { chatErrorBody } from "../../src/lib/bot/chat-error";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";

// The e2e build runs in demo mode, whose answers are paced word by word, so
// the cow has time to think and talk. These tests read the cow's `data-state`,
// never the timing of its animations.

function liveCow(page: Page) {
  return page.getByRole("button", { name: "Pat the cow" });
}

/** Every cow except the live one: they render as plain, hidden drawings. */
function stillCows(page: Page) {
  return page.locator("[data-state]:not(button)");
}

function runningAnimations(cow: Locator) {
  return cow.evaluate((element) => element.getAnimations({ subtree: true }).length);
}

async function ask(page: Page, question: string) {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
}

/**
 * Collects each state the live cow shows, in order, however briefly: a
 * MutationObserver reports every change, where polling could miss one.
 */
async function recordCowStates(page: Page): Promise<string[]> {
  const states: string[] = [];
  await page.exposeFunction("recordCowState", (state: string) => {
    states.push(state);
  });
  await page.evaluate(() => {
    const report = (window as unknown as { recordCowState: (state: string) => void })
      .recordCowState;
    let last: string | null = null;
    const record = () => {
      const cow = document.querySelector('button[aria-label="Pat the cow"]');
      const state = cow?.getAttribute("data-state") ?? null;
      if (state !== null && state !== last) {
        last = state;
        report(state);
      }
    };
    record();
    new MutationObserver(record).observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
  });
  return states;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("the greeting shows the cow, idle and moving", async ({ page }) => {
  await expect(page.getByText("Hi! Ask me about Julian's experience.")).toBeVisible();
  await expect(liveCow(page)).toBeVisible();
  await expect(liveCow(page)).toHaveAttribute("data-state", "idle");
  expect(await runningAnimations(liveCow(page))).toBeGreaterThan(0);
});

test("the cow listens while the visitor types", async ({ page }) => {
  await page.getByLabel("Your question").fill("What has Julian worked on?");
  await expect(liveCow(page)).toHaveAttribute("data-state", "listening");
});

test("the cow thinks, talks while the answer streams, licks once, then idles", async ({ page }) => {
  const states = await recordCowStates(page);
  await ask(page, "What has Julian worked on?");

  await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
  await expect(liveCow(page)).toHaveAttribute("data-state", "idle", { timeout: 10_000 });
  expect(states.slice(states.indexOf("thinking"))).toEqual([
    "thinking",
    "talking",
    "satisfied",
    "idle",
  ]);
});

test("only the latest cow moves; earlier ones are still and hidden", async ({ page }) => {
  const answers = page.getByRole("article", { name: "Answer" });
  await ask(page, "First question");
  await expect(answers.nth(0)).toContainText(DEMO_ANSWER_INTRO);
  await ask(page, "Second question");
  await expect(answers.nth(1)).toContainText(DEMO_ANSWER_INTRO);

  await expect(liveCow(page)).toHaveCount(1);
  const still = stillCows(page);
  // The greeting's cow and the first answer's.
  await expect(still).toHaveCount(2);
  for (const cow of await still.all()) {
    await expect(cow).toHaveAttribute("aria-hidden", "true");
    await expect(cow).toHaveAttribute("data-state", "idle");
    expect(await runningAnimations(cow)).toBe(0);
  }
});

test("hovering the cow tilts it and says Moo!", async ({ page }) => {
  await liveCow(page).hover();
  await expect(liveCow(page).getByText("Moo!")).toHaveCSS("opacity", "1");
  const tiltAnimations = await liveCow(page).evaluate((cow) =>
    cow
      .querySelector(".tilt")
      ?.getAnimations()
      .map((animation) => (animation instanceof CSSAnimation ? animation.animationName : "")),
  );
  expect(tiltAnimations).toEqual(["cow-tilt"]);
});

test("patting the cow plays a lick", async ({ page }) => {
  // Retried, because a click before hydration does nothing.
  await expect(async () => {
    await liveCow(page).click();
    await expect(liveCow(page)).toHaveAttribute("data-pat", "", { timeout: 500 });
  }).toPass();
  await expect(liveCow(page)).not.toHaveAttribute("data-pat");
});

test("the cow is sorry when the request fails", async ({ page }) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(chatErrorBody("unavailable")),
    }),
  );
  await ask(page, "Hello?");

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(liveCow(page)).toHaveAttribute("data-state", "sorry");
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the cow is a still drawing, and Moo! still shows on hover", async ({ page }) => {
    await expect(liveCow(page)).toHaveAttribute("data-state", "idle");
    expect(await runningAnimations(liveCow(page))).toBe(0);

    await liveCow(page).hover();
    await expect(liveCow(page).getByText("Moo!")).toHaveCSS("opacity", "1");
    expect(await runningAnimations(liveCow(page))).toBe(0);
  });

  test("the cow stays still while an answer streams", async ({ page }) => {
    await ask(page, "What has Julian worked on?");
    await expect(liveCow(page)).toHaveAttribute("data-state", /thinking|talking/);
    expect(await runningAnimations(liveCow(page))).toBe(0);
  });
});
