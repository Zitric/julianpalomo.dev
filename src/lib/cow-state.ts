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
  /** While the page's entrance plays, what it makes the cow do; null once the chat leads. */
  entrance: CowState | null;
};

/** How long the one lick of `satisfied`, and of a pat, lasts. Keep in step with cow.css. */
export const LICK_MS = 1600;

/**
 * The cow's next state. It follows the typing, not the stream: it talks from
 * the first word on screen until the last, through a tool call or a pause in
 * the stream, and an answer that just finished typing plays `satisfied` once,
 * as does the entrance's greeting. The entrance, while it plays, wins.
 * `previous` is what it showed last; the caller ends `satisfied` after
 * LICK_MS. Applying it twice to the same situation gives the same state.
 */
export function nextCowState(previous: CowState, situation: CowSituation): CowState {
  const { status, answerHasText, revealing, stopped, composer, entrance } = situation;
  if (entrance !== null) return entrance;
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
