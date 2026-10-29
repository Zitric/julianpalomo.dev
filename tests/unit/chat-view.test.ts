import { describe, expect, it } from "vitest";
import {
  answerAsText,
  chatErrorMessage,
  confirmationLine,
  hideTrailingPartialMarker,
  latestMessages,
  messageText,
  outOfQuestions,
  remainingSuggestions,
  renderAnswer,
  shouldFollow,
  splitIntoChunks,
  toolStatus,
} from "../../src/components/chat/chat-view";
import { chatErrorBody } from "../../src/lib/bot/chat-error";
import type { Source } from "../../src/lib/bot/citations";
import { t } from "../../src/lib/i18n/t";

const zustand: Source = {
  id: "redux-zustand",
  label: "Redux → Zustand",
  org: "Cazoo",
  source: "cv",
  text: "Replaced Redux with Zustand.",
  confirmedOn: "2026-10-27",
};
const remote: Source = {
  id: "remote-work",
  label: "Remote work",
  source: "julian",
  text: "Open to remote roles.",
  confirmedOn: "2026-10-27",
};

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
    // Offsets in rendered length: each citation counts one.
    expect(parts).toEqual([
      { type: "text", text: "A.", start: 0 },
      { type: "citation", number: 1, start: 2 },
      { type: "text", text: " B.", start: 3 },
      { type: "citation", number: 2, start: 6 },
      { type: "text", text: " C.", start: 7 },
      { type: "citation", number: 1, start: 10 },
    ]);
  });

  it("shows no chip for a source that isn't cited", () => {
    expect(renderAnswer("Only this.[[redux-zustand]]", [zustand, remote], false).chips).toEqual([
      { number: 1, source: zustand },
    ]);
  });

  it("drops a cited id the server didn't send as a source", () => {
    expect(renderAnswer("Made up.[[made-up]]", [zustand], false)).toEqual({
      parts: [{ type: "text", text: "Made up.", start: 0 }],
      chips: [],
      length: 8,
    });
  });

  it("hides a trailing partial marker only while streaming", () => {
    expect(renderAnswer("Wait [[redu", [zustand], true).parts).toEqual([
      { type: "text", text: "Wait ", start: 0 },
    ]);
    expect(renderAnswer("Wait [[redu", [zustand], false).parts).toEqual([
      { type: "text", text: "Wait [[redu", start: 0 },
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
  const body = (code: Parameters<typeof chatErrorBody>[0]) =>
    new Error(JSON.stringify(chatErrorBody(code)));

  it("says the assistant isn't available for the endpoint's 503 body", () => {
    expect(chatErrorMessage(body("unavailable"), "en")).toBe(t("en", "errorUnavailable"));
  });

  it("says which daily limit was reached for each 429 body, and offers another way", () => {
    expect(chatErrorMessage(body("visitor_limit"), "en")).toBe(t("en", "errorVisitorLimit"));
    expect(t("en", "errorVisitorLimit")).toMatch(/^You've reached today's limit for questions\. /);
    expect(chatErrorMessage(body("daily_budget"), "en")).toBe(t("en", "errorDailyBudget"));
  });

  it("speaks the page's language", () => {
    expect(chatErrorMessage(body("visitor_limit"), "es")).toBe(t("es", "errorVisitorLimit"));
  });

  it.each([
    JSON.stringify(chatErrorBody("failed")),
    JSON.stringify(chatErrorBody("invalid_request")),
    "Something went wrong. Please try again.",
    "Failed to fetch",
    '{"error":"something-new"}',
  ])("says something went wrong for %j", (message) => {
    expect(chatErrorMessage(new Error(message), "en")).toBe(t("en", "errorGeneric"));
  });
});

describe("outOfQuestions", () => {
  it("is true only at either daily limit", () => {
    const body = (code: Parameters<typeof chatErrorBody>[0]) =>
      new Error(JSON.stringify(chatErrorBody(code)));
    expect(outOfQuestions(body("visitor_limit"))).toBe(true);
    expect(outOfQuestions(body("daily_budget"))).toBe(true);
    expect(outOfQuestions(body("unavailable"))).toBe(false);
    expect(outOfQuestions(new Error("Failed to fetch"))).toBe(false);
    expect(outOfQuestions(undefined)).toBe(false);
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

describe("latestMessages", () => {
  type Message = { id: string; role: "user" | "assistant" };
  // What useChat sends on a new question: q1 a1 … q(n-1) a(n-1), then qn.
  function asking(questions: number): Message[] {
    const messages: Message[] = [];
    for (let n = 1; n < questions; n++) {
      messages.push({ id: `q${n}`, role: "user" }, { id: `a${n}`, role: "assistant" });
    }
    messages.push({ id: `q${questions}`, role: "user" });
    return messages;
  }
  const ids = (messages: Message[]) => messages.map((message) => message.id);

  it("returns a conversation shorter than max as it is", () => {
    expect(ids(latestMessages(asking(3), 20))).toEqual(["q1", "a1", "q2", "a2", "q3"]);
  });

  it("returns exactly max messages as they are", () => {
    expect(ids(latestMessages(asking(2), 3))).toEqual(["q1", "a1", "q2"]);
  });

  it("drops the oldest message, then the answer left at the front", () => {
    // 21 messages: the last 20 would start with a1.
    const trimmed = ids(latestMessages(asking(11), 20));
    expect(trimmed).toHaveLength(19);
    expect(trimmed.slice(0, 2)).toEqual(["q2", "a2"]);
    expect(trimmed.at(-1)).toBe("q11");
  });

  it("keeps a failed question that never got an answer", () => {
    // q2 failed, so the visitor asked q3 straight after it.
    const messages: Message[] = [
      { id: "q1", role: "user" },
      { id: "a1", role: "assistant" },
      { id: "q2", role: "user" },
      { id: "q3", role: "user" },
    ];
    expect(ids(latestMessages(messages, 3))).toEqual(["q2", "q3"]);
  });

  it("treats a stopped answer like any other", () => {
    const messages: Message[] = [
      { id: "q1", role: "user" },
      { id: "a1-stopped", role: "assistant" },
      { id: "q2", role: "user" },
    ];
    expect(ids(latestMessages(messages, 3))).toEqual(["q1", "a1-stopped", "q2"]);
    expect(ids(latestMessages(messages, 2))).toEqual(["q2"]);
  });

  it("returns an empty list for an empty conversation or a max of 0", () => {
    expect(latestMessages([], 20)).toEqual([]);
    expect(latestMessages(asking(2), 0)).toEqual([]);
  });
});

describe("splitIntoChunks", () => {
  const sources = [zustand];

  it("keeps earlier chunks' keys as the text grows, so they never remount", () => {
    const first = renderAnswer("Hello there", sources, true);
    const later = renderAnswer("Hello there, Julian", sources, true);
    const before = splitIntoChunks(first.parts, [first.length]);
    const after = splitIntoChunks(later.parts, [first.length, later.length]);
    expect(before.map(({ key }) => key)).toEqual(["t0"]);
    expect(after).toEqual([
      { key: "t0", type: "text", text: "Hello there" },
      { key: "t11", type: "text", text: ", Julian" },
    ]);
  });

  it("never cuts inside a marker that is still arriving", () => {
    const partial = renderAnswer("Moved to Zustand [[redux-zu", sources, true);
    expect(partial.length).toBe("Moved to Zustand ".length);
    const done = renderAnswer("Moved to Zustand [[redux-zustand]] in 2024.", sources, true);
    const chunks = splitIntoChunks(done.parts, [partial.length, done.length]);
    expect(chunks).toEqual([
      { key: "t0", type: "text", text: "Moved to Zustand " },
      { key: "c17", type: "citation", number: 1 },
      { key: "t18", type: "text", text: " in 2024." },
    ]);
  });
});

describe("answerAsText", () => {
  it("drops the citations and lists the sources at the end", () => {
    const { chips } = renderAnswer("It moved to Zustand [[redux-zustand]].", [zustand], false);
    expect(
      answerAsText(
        "It moved to Zustand [[redux-zustand]].",
        chips,
        { cv: "CV", julian: "Julian" },
        "Sources:",
      ),
    ).toBe("It moved to Zustand.\n\nSources:\n1. CV · Cazoo · Redux → Zustand");
  });

  it("is just the text when nothing was cited", () => {
    expect(answerAsText("No sources here.", [], { cv: "CV", julian: "Julian" }, "Sources:")).toBe(
      "No sources here.",
    );
  });
});

describe("remainingSuggestions", () => {
  it("leaves out what was asked and keeps at most the limit", () => {
    expect(remainingSuggestions(["a", "b", "c", "d", "e"], ["b", " d "], 3)).toEqual([
      "a",
      "c",
      "e",
    ]);
    expect(remainingSuggestions(["a", "b"], ["a", "b"], 3)).toEqual([]);
  });
});

describe("shouldFollow", () => {
  it("follows only a streaming answer, and only from the bottom", () => {
    expect(shouldFollow({ atBottom: true, streaming: true })).toBe(true);
    expect(shouldFollow({ atBottom: false, streaming: true })).toBe(false);
    expect(shouldFollow({ atBottom: true, streaming: false })).toBe(false);
  });
});

describe("confirmationLine", () => {
  it("says when and where Julian confirmed the claim, in each language", () => {
    expect(confirmationLine(zustand, "en")).toBe(
      "Confirmed by Julian on 27 Oct 2026 · from his CV",
    );
    expect(confirmationLine(remote, "en")).toBe("Confirmed by Julian on 27 Oct 2026 · from Julian");
    expect(confirmationLine(zustand, "es")).toBe("Confirmado por Julián el 27 oct 2026 · de su CV");
  });

  it("keeps the confirmed day west of UTC, where midnight UTC is the evening before", () => {
    const midnightUtc = Date.UTC(2026, 9, 27);
    const naive = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      timeZone: "America/New_York",
    });
    expect(naive.format(midnightUtc)).toBe("26");
    expect(confirmationLine(zustand, "en")).toContain("27 Oct 2026");
  });
});
