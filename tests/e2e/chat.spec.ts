import { expect, type Page, test } from "@playwright/test";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { chatErrorBody, STREAM_ERROR_TEXT } from "../../src/lib/bot/chat-error";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";
import { MAX_MESSAGES } from "../../src/lib/bot/limits";
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
  // The label, not the answer's first word: streamed text arrives in pieces,
  // and one of them can be the word "Demo" on its own.
  await expect(answer.locator("p").filter({ hasText: /^Demo$/ })).toBeVisible();
  await answer.getByRole("button", { name: "Check sources (1)" }).click();
  const chips = answer.getByRole("list", { name: "Sources" }).getByRole("listitem");
  await expect(chips).toHaveCount(1);
  await expect(chips.first()).toHaveText(/^1 · (CV|Julian) · /);
  await expect(answer).not.toContainText("[[");
});

test("a suggested question is sent as a message", async ({ page }) => {
  await page.getByRole("button", { name: "What is Form:at?" }).click();

  await expect(page.getByRole("list", { name: "Conversation" })).toContainText("What is Form:at?");
  await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
});

test("focus stays on the question box after sending, with Enter or Send", async ({ page }) => {
  const input = page.getByLabel("Your question");
  const answers = page.getByRole("article", { name: "Answer" });

  await input.fill("First question");
  await input.press("Enter");
  await expect(answers.nth(0)).toContainText(DEMO_ANSWER_INTRO);
  await expect(input).toBeFocused();

  await input.fill("Second question");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(answers.nth(1)).toContainText(DEMO_ANSWER_INTRO);
  await expect(input).toBeFocused();
});

test("focus moves to the question box after picking a suggestion", async ({ page }) => {
  await page.getByRole("button", { name: "What is Form:at?" }).click();

  await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
  await expect(page.getByLabel("Your question")).toBeFocused();
});

test("a conversation keeps getting answers past the server's message cap", async ({ page }) => {
  // Each demo answer takes about 2s, so this many need more than the default 30s.
  test.setTimeout(90_000);
  // One question more than fits in the cap when the whole conversation is sent.
  const questions = MAX_MESSAGES / 2 + 1;
  const answers = page.getByRole("article", { name: "Answer" });

  for (let i = 0; i < questions; i++) {
    await ask(page, `Question ${i + 1}`);
    await expect(answers.nth(i)).toContainText(DEMO_ANSWER_INTRO);
    await expect(page.getByRole("button", { name: "Send" })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  await expect(answers).toHaveCount(questions);
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

test("a stream that fails mid-answer shows the page's own error text, never the stream's", async ({
  page,
}) => {
  // The body the endpoint sends when the model fails: a UI message stream
  // whose error chunk carries STREAM_ERROR_TEXT, built with the same SDK calls.
  const failed = createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: () => {
        throw new Error("the model failed");
      },
      onError: () => STREAM_ERROR_TEXT,
    }),
  });
  const body = await failed.text();
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 200, headers: Object.fromEntries(failed.headers), body }),
  );
  await page.goto("/es");
  await page.getByLabel("Tu pregunta").fill("¿Hola?");
  await page.getByRole("button", { name: "Enviar" }).click();

  const alert = page.getByRole("alert");
  await expect(alert).toContainText(
    "Algo ha salido mal por mi parte. Vuelve a intentarlo en un momento.",
  );
  expect(body).toContain(STREAM_ERROR_TEXT);
  await expect(page.getByText(STREAM_ERROR_TEXT)).toHaveCount(0);
});
