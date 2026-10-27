/**
 * Pure helpers that turn the chat's state into what the components render.
 * Kept free of React so they can be unit-tested.
 */
import { type ChatErrorCode, chatErrorSchema } from "../../lib/bot/chat-error";
import { parseCitations, type Source } from "../../lib/bot/citations";

/**
 * Removes a citation marker that is still arriving at the end of a streaming
 * answer, such as `[[cazo`, so it never shows as raw text. Use it only while
 * the answer streams: a finished answer keeps malformed markers as text.
 */
export function hideTrailingPartialMarker(text: string): string {
  return text.replace(/\[(?:\[[a-z0-9-]*)?$/, "");
}

/** A message's text: its text parts joined, in order. */
export function messageText(parts: readonly { type: string; text?: unknown }[]): string {
  return parts
    .flatMap((part) => (part.type === "text" && typeof part.text === "string" ? [part.text] : []))
    .join("");
}

type AnswerPart = { type: "text"; text: string } | { type: "citation"; number: number };

/**
 * Splits an answer into text and numbered citations, and lists the chips to
 * show under it. A citation counts only when its id is both in the text and
 * among the sources the server sent for this answer; any other marker is
 * dropped. Chips are numbered in the order they're first cited.
 */
export function renderAnswer(
  text: string,
  sources: readonly Source[],
  streaming: boolean,
): { parts: AnswerPart[]; chips: { number: number; source: Source }[] } {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const visible = streaming ? hideTrailingPartialMarker(text) : text;
  const { segments } = parseCitations(visible, new Set(byId.keys()));

  const numbers = new Map<string, number>();
  const chips: { number: number; source: Source }[] = [];
  const parts = segments.map((segment): AnswerPart => {
    if (segment.type === "text") return segment;
    let number = numbers.get(segment.id);
    const source = byId.get(segment.id);
    if (number === undefined && source) {
      number = numbers.size + 1;
      numbers.set(segment.id, number);
      chips.push({ number, source });
    }
    // parseCitations only returns allowed ids, which are all in byId, so a
    // number is always set by here.
    return { type: "citation", number: number ?? 0 };
  });
  return { parts, chips };
}

const TOOL_STATUS: Record<string, string> = {
  "tool-get_claims": "Looking up claims…",
  "tool-search_claims": "Looking up claims…",
  "tool-list_topics": "Checking what topics exist…",
};

/** A plain-words line while one of the answer's tools is still running, or undefined. */
export function toolStatus(
  parts: readonly { type: string; state?: unknown }[],
): string | undefined {
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index];
    const running = part?.state === "input-streaming" || part?.state === "input-available";
    if (part && running && part.type in TOOL_STATUS) return TOOL_STATUS[part.type];
  }
  return undefined;
}

/**
 * What to tell the visitor when a request fails. The transport puts the
 * response body in the error's message, so a typed body from the endpoint
 * picks the text; anything else, a stream or network error, is generic.
 */
export function chatErrorMessage(error: Error): string {
  let code: ChatErrorCode | undefined;
  try {
    const parsed = chatErrorSchema.safeParse(JSON.parse(error.message));
    code = parsed.success ? parsed.data.error : undefined;
  } catch {
    // Not JSON: a stream or network error, which gets the generic text.
  }
  switch (code) {
    case "unavailable":
      return "The assistant isn't available here right now.";
    case "visitor_limit":
      return "You've reached today's limit for questions.";
    case "daily_budget":
      return "The assistant has reached its daily budget. Try again tomorrow.";
    case "invalid_request":
    case "failed":
    case undefined:
      return "Something went wrong.";
    default: {
      const unhandled: never = code;
      throw new Error(String(unhandled));
    }
  }
}
