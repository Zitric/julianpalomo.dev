/**
 * Pure helpers that turn the chat's state into what the components render.
 * Kept free of React so they can be unit-tested.
 */
import { type ChatErrorCode, chatErrorSchema } from "../../lib/bot/chat-error";
import { chipLabel, parseCitations, type Source } from "../../lib/bot/citations";
import type { Locale } from "../../lib/i18n/locale";
import { t } from "../../lib/i18n/t";

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

/**
 * The latest `max` messages, starting with the visitor's: the oldest go first,
 * then any answer left at the front, so the request opens with a question as
 * a new conversation does. The screen keeps the whole conversation; only the
 * request is trimmed.
 */
export function latestMessages<M extends { role: string }>(
  messages: readonly M[],
  max: number,
): M[] {
  // Not slice(-max): slice(-0) would keep everything.
  const latest = messages.slice(Math.max(messages.length - max, 0));
  const firstQuestion = latest.findIndex((message) => message.role === "user");
  return firstQuestion === -1 ? [] : latest.slice(firstQuestion);
}

/**
 * A piece of the answer as rendered. `start` is its offset in rendered
 * length, where each character of text counts one and each citation counts
 * one: the hidden partial marker and any dropped marker count nothing, so
 * the length only grows while an answer types itself out.
 */
type AnswerPart =
  | { type: "text"; text: string; start: number }
  | { type: "citation"; number: number; start: number };

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
): { parts: AnswerPart[]; chips: { number: number; source: Source }[]; length: number } {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const visible = streaming ? hideTrailingPartialMarker(text) : text;
  const { segments } = parseCitations(visible, new Set(byId.keys()));

  const numbers = new Map<string, number>();
  const chips: { number: number; source: Source }[] = [];
  let length = 0;
  const parts = segments.map((segment): AnswerPart => {
    const start = length;
    length += segment.type === "text" ? segment.text.length : 1;
    if (segment.type === "text") return { ...segment, start };
    let number = numbers.get(segment.id);
    const source = byId.get(segment.id);
    if (number === undefined && source) {
      number = numbers.size + 1;
      numbers.set(segment.id, number);
      chips.push({ number, source });
    }
    // parseCitations only returns allowed ids, which are all in byId, so a
    // number is always set by here.
    return { type: "citation", number: number ?? 0, start };
  });
  return { parts, chips, length };
}

/** A span of the rendered answer, keyed by where it starts so it never remounts. */
export type AnswerChunk =
  | { key: string; type: "text"; text: string }
  | { key: string; type: "citation"; number: number };

/**
 * Cuts the answer's parts at `boundaries`, the rendered lengths it had on
 * earlier renders while it typed itself out. Each chunk is keyed by its
 * start, so a chunk that was already on screen keeps its key and never
 * remounts: only the words typed since the last render mount, and fade in. A citation is
 * never cut.
 */
export function splitIntoChunks(
  parts: readonly AnswerPart[],
  boundaries: readonly number[],
): AnswerChunk[] {
  const chunks: AnswerChunk[] = [];
  for (const part of parts) {
    if (part.type === "citation") {
      chunks.push({ key: `c${part.start}`, type: "citation", number: part.number });
      continue;
    }
    const end = part.start + part.text.length;
    const cuts = boundaries.filter((at) => at > part.start && at < end);
    let from = part.start;
    for (const at of [...cuts, end]) {
      chunks.push({
        key: `t${from}`,
        type: "text",
        text: part.text.slice(from - part.start, at - part.start),
      });
      from = at;
    }
  }
  return chunks;
}

/**
 * The answer as plain text for the clipboard: citations removed, then the
 * numbered sources, ready to paste into an email.
 */
export function answerAsText(
  text: string,
  chips: readonly { number: number; source: Source }[],
  names: Record<Source["source"], string>,
  sourcesHeading: string,
): string {
  const { segments } = parseCitations(text, new Set(chips.map(({ source }) => source.id)));
  const prose = segments
    .flatMap((segment) => (segment.type === "text" ? [segment.text] : []))
    .join("")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .trim();
  if (chips.length === 0) return prose;
  const lines = chips.map(({ number, source }) => `${number}. ${chipLabel(source, names)}`);
  return `${prose}\n\n${sourcesHeading}\n${lines.join("\n")}`;
}

/** The suggested questions this conversation hasn't asked yet, at most `limit`. */
export function remainingSuggestions(
  suggestions: readonly string[],
  asked: readonly string[],
  limit: number,
): string[] {
  const seen = new Set(asked.map((question) => question.trim()));
  return suggestions.filter((question) => !seen.has(question)).slice(0, limit);
}

/**
 * Whether the view follows an answer that's typing itself out, which can go
 * on after its stream has ended: only when the visitor was already at the
 * bottom. Otherwise a "New answer ↓" pill offers the way down.
 */
export function shouldFollow({ atBottom, streaming }: { atBottom: boolean; streaming: boolean }) {
  return streaming && atBottom;
}

const TOOL_STATUS: Record<string, "lookingUpClaims" | "checkingTopics"> = {
  "tool-get_claims": "lookingUpClaims",
  "tool-search_claims": "lookingUpClaims",
  "tool-list_topics": "checkingTopics",
};

/** A plain-words line while one of the answer's tools is still running, or undefined. */
export function toolStatus(
  parts: readonly { type: string; state?: unknown }[],
  locale: Locale,
): string | undefined {
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index];
    const running = part?.state === "input-streaming" || part?.state === "input-available";
    const key = part && running ? TOOL_STATUS[part.type] : undefined;
    if (key) return t(locale, key);
  }
  return undefined;
}

/**
 * The endpoint's error code for a failed request, or undefined for a stream
 * or network error. The transport puts the response body in the error's
 * message.
 */
function chatErrorCode(error: Error): ChatErrorCode | undefined {
  try {
    const parsed = chatErrorSchema.safeParse(JSON.parse(error.message));
    return parsed.success ? parsed.data.error : undefined;
  } catch {
    // Not JSON: a stream or network error.
    return undefined;
  }
}

/** Whether no more questions can be asked today: either daily limit was reached. */
export function outOfQuestions(error: Error | undefined): boolean {
  const code = error ? chatErrorCode(error) : undefined;
  return code === "visitor_limit" || code === "daily_budget";
}

/**
 * What to tell the visitor when a request fails. The transport puts the
 * response body in the error's message, so a typed body from the endpoint
 * picks the text; anything else, a stream or network error, is generic.
 */
export function chatErrorMessage(error: Error, locale: Locale): string {
  const code = chatErrorCode(error);
  switch (code) {
    case "unavailable":
      return t(locale, "errorUnavailable");
    case "visitor_limit":
      return t(locale, "errorVisitorLimit");
    case "daily_budget":
      return t(locale, "errorDailyBudget");
    case "invalid_request":
    case "failed":
    case undefined:
      return t(locale, "errorGeneric");
    default: {
      const unhandled: never = code;
      throw new Error(String(unhandled));
    }
  }
}

// Dates read the way DESIGN.md writes them: "27 Oct 2026", "27 oct 2026".
const DATE_LOCALE: Record<Locale, string> = { en: "en-GB", es: "es-ES" };

/**
 * "Confirmed by Julian on 27 Oct 2026 · from his CV". The date is formatted
 * in UTC: `YYYY-MM-DD` is midnight UTC, which a browser west of UTC would
 * otherwise show as the day before.
 */
export function confirmationLine(source: Source, locale: Locale): string {
  const [year = 0, month = 1, day = 1] = source.confirmedOn.split("-").map(Number);
  const date = new Intl.DateTimeFormat(DATE_LOCALE[locale], {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(Date.UTC(year, month - 1, day));
  return t(locale, "confirmedBy")(
    date,
    t(locale, source.source === "cv" ? "fromCv" : "fromJulian"),
  );
}

/**
 * A ref callback that brings an element into view when it appears, such as an
 * opened claim or an error. It's a module-level function, so React calls it on
 * mount only, not on every render. Give the element `max-lg:scroll-mb-44` so it
 * stops clear of the composer fixed to the bottom on phones.
 */
export function revealOnMount(node: HTMLElement | null): void {
  node?.scrollIntoView({ block: "nearest" });
}
