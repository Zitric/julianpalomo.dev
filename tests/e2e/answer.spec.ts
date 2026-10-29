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
