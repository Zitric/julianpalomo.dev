import { describe, expect, it } from "vitest";
import {
  chatErrorMessage,
  hideTrailingPartialMarker,
  messageText,
  renderAnswer,
  toolStatus,
} from "../../src/components/chat/chat-view";
import { chatErrorBody } from "../../src/lib/bot/chat-error";
import type { Source } from "../../src/lib/bot/citations";

const zustand: Source = {
  id: "redux-zustand",
  label: "Redux → Zustand",
  org: "Cazoo",
  source: "cv",
};
const remote: Source = { id: "remote-work", label: "Remote work", source: "julian" };

describe("hideTrailingPartialMarker", () => {
  it.each(["Text [", "Text [[", "Text [[cazo", "Text [[redux-"])(
    "hides the unfinished marker in %j",
    (text) => {
      expect(hideTrailingPartialMarker(text)).toBe("Text ");
    },
  );

  it("leaves finished markers and plain text alone", () => {
    expect(hideTrailingPartialMarker("Done.[[redux-zustand]]")).toBe("Done.[[redux-zustand]]");
    expect(hideTrailingPartialMarker("No marker here.")).toBe("No marker here.");
  });
});

describe("renderAnswer", () => {
  it("shows a chip only for ids both cited and among the sources, numbered by first citation", () => {
    const { parts, chips } = renderAnswer(
      "A.[[remote-work]] B.[[redux-zustand]] C.[[remote-work]]",
      [zustand, remote],
      false,
    );
    expect(chips).toEqual([
      { number: 1, source: remote },
      { number: 2, source: zustand },
    ]);
    expect(parts).toEqual([
      { type: "text", text: "A." },
      { type: "citation", number: 1 },
      { type: "text", text: " B." },
      { type: "citation", number: 2 },
      { type: "text", text: " C." },
      { type: "citation", number: 1 },
    ]);
  });

  it("shows no chip for a source that isn't cited", () => {
    expect(renderAnswer("Only this.[[redux-zustand]]", [zustand, remote], false).chips).toEqual([
      { number: 1, source: zustand },
    ]);
  });

  it("drops a cited id the server didn't send as a source", () => {
    expect(renderAnswer("Made up.[[made-up]]", [zustand], false)).toEqual({
      parts: [{ type: "text", text: "Made up." }],
      chips: [],
    });
  });

  it("hides a trailing partial marker only while streaming", () => {
    expect(renderAnswer("Wait [[redu", [zustand], true).parts).toEqual([
      { type: "text", text: "Wait " },
    ]);
    expect(renderAnswer("Wait [[redu", [zustand], false).parts).toEqual([
      { type: "text", text: "Wait [[redu" },
    ]);
  });
});

describe("toolStatus", () => {
  it("names the running tool in plain words", () => {
    expect(toolStatus([{ type: "tool-get_claims", state: "input-available" }], "en")).toBe(
      "Looking up claims…",
    );
    expect(toolStatus([{ type: "tool-list_topics", state: "input-streaming" }], "en")).toBe(
      "Checking what topics exist…",
    );
  });

  it("speaks the page's language", () => {
    expect(toolStatus([{ type: "tool-search_claims", state: "input-available" }], "es")).toBe(
      "Buscando en los datos confirmados…",
    );
  });

  it("says nothing once tools are done or when there are none", () => {
    expect(
      toolStatus([{ type: "tool-get_claims", state: "output-available" }], "en"),
    ).toBeUndefined();
    expect(toolStatus([{ type: "text" }], "en")).toBeUndefined();
  });
});

describe("chatErrorMessage", () => {
  it("says the assistant isn't available for the endpoint's 503 body", () => {
    expect(chatErrorMessage(new Error(JSON.stringify(chatErrorBody("unavailable"))), "en")).toBe(
      "The assistant isn't available here right now.",
    );
  });

  it("says which daily limit was reached for each 429 body", () => {
    expect(chatErrorMessage(new Error(JSON.stringify(chatErrorBody("visitor_limit"))), "en")).toBe(
      "You've reached today's limit for questions.",
    );
    expect(chatErrorMessage(new Error(JSON.stringify(chatErrorBody("daily_budget"))), "en")).toBe(
      "The assistant has reached its daily budget. Try again tomorrow.",
    );
  });

  it("speaks the page's language", () => {
    expect(chatErrorMessage(new Error(JSON.stringify(chatErrorBody("visitor_limit"))), "es")).toBe(
      "Has llegado al límite de preguntas de hoy.",
    );
  });

  it.each([
    JSON.stringify(chatErrorBody("failed")),
    JSON.stringify(chatErrorBody("invalid_request")),
    "Something went wrong. Please try again.",
    "Failed to fetch",
    '{"error":"something-new"}',
  ])("says something went wrong for %j", (message) => {
    expect(chatErrorMessage(new Error(message), "en")).toBe("Something went wrong.");
  });
});

describe("messageText", () => {
  it("joins the text parts in order and skips the rest", () => {
    expect(
      messageText([
        { type: "text", text: "One " },
        { type: "tool-get_claims" },
        { type: "step-start" },
        { type: "text", text: "two." },
      ]),
    ).toBe("One two.");
  });
});
