/**
 * What the assistant's cow is doing, derived from the chat (DESIGN.md section
 * 9). Pure and free of React so every transition can be unit-tested.
 */
import type { ChatStatus } from "ai";

export type CowState = "idle" | "listening" | "thinking" | "talking" | "satisfied" | "sorry";

/** Everything in the chat the cow reacts to. */
export type CowSituation = {
  status: ChatStatus;
  /** The latest answer has typed at least one word onto the screen. */
  answerHasText: boolean;
  /** The latest answer is still typing itself out, even if its stream has ended. */
  revealing: boolean;
  /** The visitor pressed Stop on the last answer. */
  stopped: boolean;
  composer: { hasText: boolean; focused: boolean };
};

/** How long the one lick of `satisfied`, and of a pat, lasts. Keep in step with cow.css. */
export const LICK_MS = 1600;

/**
 * The cow's next state. It follows the typing, not the stream: it talks from
 * the first word on screen until the last, through a tool call or a pause in
 * the stream, and an answer that just finished typing plays `satisfied` once.
 * `previous` is what it showed last; the caller ends `satisfied` after
 * LICK_MS. Applying it twice to the same situation gives the same state.
 */
export function nextCowState(previous: CowState, situation: CowSituation): CowState {
  const { status, answerHasText, revealing, stopped, composer } = situation;
  switch (status) {
    case "error":
      return "sorry";
    case "submitted":
      return "thinking";
    case "streaming":
      return answerHasText ? "talking" : "thinking";
    case "ready": {
      if (revealing && !stopped) return answerHasText ? "talking" : "thinking";
      const listening = composer.hasText && composer.focused;
      const justAnswered = previous === "thinking" || previous === "talking";
      if (!stopped && !listening && (justAnswered || previous === "satisfied")) {
        return "satisfied";
      }
      return listening ? "listening" : "idle";
    }
    default: {
      const unhandled: never = status;
      throw new Error(String(unhandled));
    }
  }
}

/** Where the one animated cow is: only the latest one moves. */
export type CowSlot =
  | { kind: "greeting" }
  | { kind: "pending" }
  | { kind: "answer"; id: string }
  | { kind: "error" };

/**
 * The latest cow: beside the error notice after a failure, in a row of its
 * own while a question waits for its first chunk, next to the last answer,
 * or, before any answer, in the greeting.
 */
export function liveCowSlot(
  status: ChatStatus,
  messages: readonly { id: string; role: string }[],
): CowSlot {
  if (status === "error") return { kind: "error" };
  if (status === "submitted" && messages.at(-1)?.role !== "assistant") return { kind: "pending" };
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message?.role === "assistant") return { kind: "answer", id: message.id };
  }
  return { kind: "greeting" };
}
