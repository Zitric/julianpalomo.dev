import { expect, type Request, test } from "@playwright/test";
import { DEMO_ANSWER_INTRO } from "../../src/lib/bot/demo";

// These open `/` without a cookie and expect English, so they assume the
// runner isn't in Spain (.claude/rules/tests.md). The country rule itself is
// unit-tested in tests/unit/locale.test.ts.

// React may write the attribute as hrefLang or hreflang; HTML doesn't mind.
const HREFLANG = [
  /<link rel="alternate" hreflang="en" href="https:\/\/julianpalomo\.dev\/"/i,
  /<link rel="alternate" hreflang="es" href="https:\/\/julianpalomo\.dev\/es"/i,
  /<link rel="alternate" hreflang="x-default" href="https:\/\/julianpalomo\.dev\/"/i,
];

test.describe("the server's HTML", () => {
  test("/es is Spanish, with its own title", async ({ request }) => {
    const html = await (await request.get("/es")).text();
    expect(html).toMatch(/<html[^>]*\slang="es"/);
    expect(html).toContain("Julián Palomo");
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toMatch(/<title>Julián Palomo · /);
  });

  test("/es stays Spanish with lang=en", async ({ request }) => {
    const response = await request.get("/es", { headers: { cookie: "lang=en" }, maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/<html[^>]*\slang="es"/);
  });

  test("/ with lang=es is a 302 to /es that keeps the query string and isn't cached", async ({
    request,
  }) => {
    const response = await request.get("/?utm_source=linkedin", {
      headers: { cookie: "lang=es" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(new URL(response.headers().location ?? "", "http://x").pathname).toBe("/es");
    expect(new URL(response.headers().location ?? "", "http://x").search).toBe(
      "?utm_source=linkedin",
    );
    expect(response.headers()["cache-control"]).toBe("private, no-store");
  });

  test("/ stays English with lang=en and varies on the cookie", async ({ request }) => {
    const response = await request.get("/", { headers: { cookie: "lang=en" }, maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(await response.text()).toMatch(/<html[^>]*\slang="en"/);
    expect(response.headers().vary).toMatch(/cookie/i);
  });

  for (const path of ["/", "/es"]) {
    test(`${path} links both languages with hreflang`, async ({ request }) => {
      const html = await (await request.get(path, { headers: { cookie: "lang=en" } })).text();
      for (const link of HREFLANG) expect(html).toMatch(link);
    });
  }

  test("any other language is a 404", async ({ request }) => {
    expect((await request.get("/fr")).status()).toBe(404);
  });
});

test("the toggle switches language, says so in the other language and remembers it", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const toSpanish = page.getByRole("button", { name: "Ver en español" });
  await expect(toSpanish).toHaveAttribute("lang", "es");
  await toSpanish.click();

  await expect(page).toHaveURL(/\/es$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1, name: "Julián Palomo" })).toBeVisible();
  const cookie = async () => (await context.cookies()).find(({ name }) => name === "lang")?.value;
  expect(await cookie()).toBe("es");

  await page.getByRole("button", { name: "View in English" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await cookie()).toBe("en");
});

test("a conversation survives a language switch both ways", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your question").fill("What has Julian worked on?");
  await page.getByRole("button", { name: "Send" }).click();
  const answer = page.getByRole("article", { name: "Answer" });
  await expect(answer).toContainText(DEMO_ANSWER_INTRO);
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

  await page.getByRole("button", { name: "Ver en español" }).click();
  await expect(page).toHaveURL(/\/es$/);
  await expect(page.getByText("What has Julian worked on?")).toBeVisible();
  await expect(page.getByRole("article", { name: "Respuesta" })).toContainText(DEMO_ANSWER_INTRO);

  await page.getByRole("button", { name: "View in English" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("What has Julian worked on?")).toBeVisible();
  await expect(answer).toContainText(DEMO_ANSWER_INTRO);
});

const isChatPost = (request: Request) =>
  request.url().endsWith("/api/chat") && request.method() === "POST";

for (const { path, locale, label, send } of [
  { path: "/", locale: "en", label: "Your question", send: "Send" },
  { path: "/es", locale: "es", label: "Tu pregunta", send: "Enviar" },
] as const) {
  test(`a question on ${path} tells the server the page is "${locale}"`, async ({ page }) => {
    await page.goto(path);
    const sent = page.waitForRequest(isChatPost);
    await page.getByLabel(label).fill("TypeScript?");
    await page.getByRole("button", { name: send }).click();
    expect((await sent).postDataJSON()).toMatchObject({ locale });
  });
}

test("after a language switch, the next question carries the new page's language", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Your question").fill("What has Julian worked on?");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("article", { name: "Answer" })).toContainText(DEMO_ANSWER_INTRO);
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

  await page.getByRole("button", { name: "Ver en español" }).click();
  await expect(page).toHaveURL(/\/es$/);
  const sent = page.waitForRequest(isChatPost);
  await page.getByLabel("Tu pregunta").fill("¿Qué estudió Julian?");
  await page.getByRole("button", { name: "Enviar" }).click();
  expect((await sent).postDataJSON()).toMatchObject({ locale: "es" });
});
