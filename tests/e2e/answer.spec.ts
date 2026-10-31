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
  // The number also opened the list, so its chip is in view.
  await expect(answer.getByRole("button", { name: "Hide sources" })).toBeVisible();
  // The chip opens the same claim, and a second press closes it.
  const chip = answer.getByRole("list", { name: "Sources" }).getByRole("button");
  await expect(chip).toHaveAttribute("aria-expanded", "true");
  await chip.click();
  await expect(answer).not.toContainText("Confirmed by Julian");
});

test("the answer types itself out, and its sources link appears only after the last word", async ({
  page,
}) => {
  await ask(page, "What has Julian worked on?");
  // Each animation frame: how long the answer's text is, and whether its sources link is there.
  const frames = await page.evaluate(
    () =>
      new Promise<{ length: number; link: boolean }[]>((resolve) => {
        const seen: { length: number; link: boolean }[] = [];
        const sample = () => {
          const answer = document.querySelector('article[aria-label="Answer"]');
          const length =
            answer?.querySelector('[data-testid="answer-text"]')?.textContent?.length ?? 0;
          const link = [...(answer?.querySelectorAll("button") ?? [])].some((button) =>
            button.textContent?.startsWith("Check sources"),
          );
          seen.push({ length, link });
          if (link || seen.length > 1200) resolve(seen);
          else requestAnimationFrame(sample);
        };
        sample();
      }),
  );
  const lengths = frames.filter((frame) => !frame.link).map((frame) => frame.length);
  expect(new Set(lengths).size).toBeGreaterThan(5);
  const final = frames.at(-1);
  expect(final?.link).toBe(true);
  // The link came with or after the last word, never while text was still typing.
  expect(Math.max(...lengths)).toBeLessThanOrEqual(final?.length ?? 0);
  const text = await page.getByTestId("answer-text").textContent();
  expect(final?.length).toBe(text?.length);
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

test("the sources stay folded until the link opens them, from the keyboard too", async ({
  page,
}) => {
  await ask(page, "What has Julian worked on?");
  const answer = page.getByRole("article", { name: "Answer" });
  const link = answer.getByRole("button", { name: "Check sources (1)" });
  await expect(link).toHaveAttribute("aria-expanded", "false");
  const list = answer.getByRole("list", { name: "Sources" });
  await expect(list).toHaveCount(0);

  // aria-controls names the element the list appears in.
  const controls = await link.getAttribute("aria-controls");
  expect(controls).toBeTruthy();
  await link.focus();
  await page.keyboard.press("Enter");
  const hide = answer.getByRole("button", { name: "Hide sources" });
  await expect(hide).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator(`[id="${controls}"]`).getByRole("list", { name: "Sources" }),
  ).toBeVisible();

  // Hiding the list also closes a claim opened from its chip.
  await list.getByRole("button").click();
  await expect(answer).toContainText("Confirmed by Julian");
  await hide.focus();
  await page.keyboard.press("Enter");
  await expect(list).toHaveCount(0);
  await expect(answer).not.toContainText("Confirmed by Julian");
  await expect(link).toHaveAttribute("aria-expanded", "false");
});

test("the sources link speaks Spanish on /es", async ({ page }) => {
  await page.goto("/es");
  await page.getByLabel("Tu pregunta").fill("¿En qué ha trabajado Julián?");
  await page.getByRole("button", { name: "Enviar" }).click();
  const answer = page.getByRole("article", { name: "Respuesta" });
  await answer.getByRole("button", { name: "Ver fuentes (1)" }).click();
  await expect(answer.getByRole("button", { name: "Ocultar fuentes" })).toBeVisible();
  await expect(answer.getByRole("list", { name: "Fuentes" }).getByRole("listitem")).toHaveCount(1);
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
  // The chat fills the screen under it: the hero, the name and the role have
  // scrolled away, and the cow on the chat's edge sits just under the bar.
  await expect(page.locator("svg.landscape")).not.toBeInViewport();
  await expect(page.getByRole("heading", { level: 1 })).not.toBeInViewport();
  const cow = await page.getByRole("button", { name: "Pat the cow" }).boundingBox();
  expect(cow?.y).toBeGreaterThanOrEqual(58);
  expect(cow?.y).toBeLessThanOrEqual(58 + 48);
  // The answer types itself out in view, so it's followed: no "New answer ↓"
  // at any point while it types (checked once, not retried until it's gone).
  await expect(page.getByTestId("answer-text")).not.toHaveText("");
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  expect(await page.getByRole("button", { name: "New answer ↓" }).count()).toBe(0);
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
  await answer.getByRole("button", { name: "Check sources (1)" }).click();
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
    // The number opened the list too, so its chips are part of the check.
    await expect(answer.getByRole("list", { name: "Sources" })).toBeVisible();
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
