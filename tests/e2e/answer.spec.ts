import { expect, test } from "@playwright/test";
import { chatErrorBody } from "../../src/lib/bot/chat-error";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";

// The demo answer quotes the first confirmed claim and cites it once
// (src/lib/bot/demo.ts), so every check here has one numbered citation.

test.beforeEach(async ({ page }) => {
  await page.route("**/api/weather", (route) => route.fulfill({ json: { weather: null } }));
  await page.goto("/");
});

async function ask(page: import("@playwright/test").Page, question: string) {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
}

test("a citation opens its claim with when Julian confirmed it", async ({ page }) => {
  await ask(page, "What has Julian worked on?");
  const answer = page.getByRole("article", { name: "Answer" });
  await expect(answer).toContainText(DEMO_ANSWER_INTRO);
  await expect(answer.getByRole("button", { name: /^Copy$/ })).toBeVisible();

  const citation = answer.getByRole("button", { name: /^Source 1: / });
  await expect(citation).toHaveText("1");
  await citation.click();
  await expect(citation).toHaveAttribute("aria-expanded", "true");
  await expect(answer).toContainText(
    /Confirmed by Julian on \d{1,2} [A-Z][a-z]{2} \d{4} · from (his CV|Julian)/,
  );
  // The chip opens the same claim, and a second press closes it.
  const chip = answer.getByRole("list", { name: "Sources" }).getByRole("button");
  await expect(chip).toHaveAttribute("aria-expanded", "true");
  await chip.click();
  await expect(answer).not.toContainText("Confirmed by Julian");
});

test("Copy puts the answer and its sources on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await ask(page, "What has Julian worked on?");
  const answer = page.getByRole("article", { name: "Answer" });
  const copy = answer.getByRole("button", { name: /^Copy$/ });
  await copy.click();
  await expect(answer.getByRole("button", { name: "Copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith(DEMO_ANSWER_INTRO)).toBe(true);
  expect(copied).not.toContain("[[");
  expect(copied).toMatch(/\n\nSources:\n1\. (CV|Julian) · /);
});

test("Keep asking offers the suggestions not asked yet", async ({ page }) => {
  await page.getByRole("button", { name: "What is Form:at?" }).click();
  const more = page.getByRole("list", { name: "Keep asking" });
  await expect(more.getByRole("button")).toHaveCount(3);
  await expect(more).not.toContainText("What is Form:at?");
});

test("scrolling up while an answer streams shows the New answer pill", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await ask(page, "What has Julian worked on?");
  await page.evaluate(() => window.scrollTo(0, 0));
  const pill = page.getByRole("button", { name: "New answer ↓" });
  await expect(pill).toBeVisible();
  await pill.click();
  await expect(page.getByRole("article", { name: "Answer" })).toBeInViewport();
});

test("the daily limit says so warmly, once, and closes the composer for today", async ({
  page,
}) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 429, json: chatErrorBody("visitor_limit") }),
  );
  await ask(page, "One more?");
  const alert = page.getByRole("alert");
  await expect(alert).toHaveCount(1);
  await expect(alert).toContainText(
    "You've reached today's limit for questions. Come back tomorrow, or write to Julian directly.",
  );
  await expect(alert.getByRole("link", { name: "LinkedIn" })).toBeVisible();
  const box = page.getByLabel("Your question");
  await expect(box).toBeDisabled();
  await expect(box).toHaveAttribute("placeholder", "Questions are back tomorrow");
});

test("a phone gets the compact bar after the first question", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const bar = page
    .locator("div.fixed")
    .filter({ has: page.getByText("Julian Palomo", { exact: true }) });
  await expect(bar).toHaveCount(0);
  await ask(page, "What has Julian worked on?");
  await expect(bar).toBeVisible();
  await expect(bar.getByRole("button", { name: /^Switch to (dark|light) theme$/ })).toBeVisible();
  expect((await bar.boundingBox())?.height).toBe(58);
  // The chat fills the screen under it: the hero has scrolled away.
  await expect(page.locator("svg.landscape")).not.toBeInViewport();
});

test("on a phone, an opened claim and the limit error stop clear of the composer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const composer = page.locator("form").filter({ has: page.getByLabel("Your question") });
  const above = async (element: import("@playwright/test").Locator) => {
    const box = await element.boundingBox();
    const fixed = await composer.boundingBox();
    expect(box && fixed && box.y + box.height <= fixed.y).toBe(true);
  };

  await ask(page, "What has Julian worked on?");
  const answer = page.getByRole("article", { name: "Answer" });
  await answer.getByRole("list", { name: "Sources" }).getByRole("button").click();
  await above(answer.getByText(/^Confirmed by Julian on /));

  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 429, json: chatErrorBody("visitor_limit") }),
  );
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await ask(page, "One more?");
  await above(page.getByRole("alert"));
});

test("a laptop never gets the compact bar", async ({ page }) => {
  await ask(page, "What has Julian worked on?");
  await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
  const bar = page
    .locator("div.fixed")
    .filter({ has: page.getByText("Julian Palomo", { exact: true }) });
  await expect(bar).toBeHidden();
});

test("screen readers hear Answering…, then the whole answer once", async ({ page }) => {
  const announcer = page.getByTestId("chat-announcer");
  await expect(announcer).toHaveAttribute("aria-live", "polite");
  // Nothing else in the conversation is a live region, so it's never read piece by piece.
  await ask(page, "What has Julian worked on?");
  await expect(announcer).toHaveText("Answering…");
  await expect(announcer).toContainText(DEMO_ANSWER_INTRO);
  await expect(announcer).not.toContainText("[[");
  expect(await page.locator("[aria-live]").count()).toBe(1);
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("the answer, its chips and its claim appear without animating", async ({ page }) => {
    await ask(page, "What has Julian worked on?");
    const answer = page.getByRole("article", { name: "Answer" });
    await expect(answer.getByRole("button", { name: /^Copy$/ })).toBeVisible();
    await answer.getByRole("button", { name: /^Source 1: / }).click();
    const running = await page
      .locator("main")
      .evaluate(
        (main) =>
          main
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
      );
    expect(running).toBe(0);
  });
});
