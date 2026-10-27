import { expect, type Page, test } from "@playwright/test";
import { chatErrorBody } from "../../src/lib/bot/chat-error";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";
import { site } from "../../src/lib/site";

// The e2e build runs in demo mode (playwright.config.ts), so these answers come
// from a scripted model that quotes a real confirmed claim.

async function ask(page: Page, question: string) {
  await page.getByLabel("Your question").fill(question);
  await page.getByRole("button", { name: "Send" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("a question streams the demo answer with a source chip and the demo label", async ({
  page,
}) => {
  await ask(page, "What has Julian worked on?");

  const answer = page.getByRole("article", { name: "Answer" });
  await expect(answer).toContainText(DEMO_ANSWER_INTRO);
  await expect(answer.getByText("Demo", { exact: true })).toBeVisible();
  const chips = answer.getByRole("list", { name: "Sources" }).getByRole("listitem");
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toHaveText(/^\[1\] (CV|Julian) · /);
  await expect(answer).not.toContainText("[[");
});

test("a suggested question is sent as a message", async ({ page }) => {
  await page.getByRole("button", { name: "What is Form:at?" }).click();

  await expect(page.getByRole("list", { name: "Conversation" })).toContainText("What is Form:at?");
  await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
});

test("the counter blocks a message over 1,000 characters", async ({ page }) => {
  const input = page.getByLabel("Your question");
  await input.fill("x".repeat(1_001));

  await expect(page.getByText("1 character over the 1,000 limit")).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Send" })).toBeDisabled();
});

test("a 503 shows that the assistant isn't available, with the contact links", async ({ page }) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify(chatErrorBody("unavailable")),
    }),
  );
  await ask(page, "Hello?");

  const alert = page.getByRole("alert");
  await expect(alert).toContainText("The assistant isn't available here right now.");
  await expect(alert.getByRole("link", { name: "LinkedIn" })).toHaveAttribute(
    "href",
    site.links.linkedin,
  );
  await expect(alert.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    site.links.github,
  );
});
