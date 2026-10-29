import { describe, expect, it } from "vitest";
import {
  type CowSituation,
  type CowState,
  liveCowSlot,
  nextCowState,
} from "../../src/lib/cow-state";

const quiet: CowSituation = {
  status: "ready",
  answerHasText: false,
  revealing: false,
  stopped: false,
  composer: { hasText: false, focused: false },
};

function situation(change: Partial<CowSituation>): CowSituation {
  return { ...quiet, ...change };
}

/** Runs the situations in order from idle, as a chat would, and returns each state. */
function play(...situations: CowSituation[]): CowState[] {
  const states: CowState[] = [];
  let state: CowState = "idle";
  for (const next of situations) {
    state = nextCowState(state, next);
    states.push(state);
  }
  return states;
}

const typing = situation({ composer: { hasText: true, focused: true } });
const submitted = situation({ status: "submitted" });
const lookingUp = situation({ status: "streaming" });
const streamingText = situation({ status: "streaming", answerHasText: true, revealing: true });
// The stream has ended, but the answer is still typing itself out.
const typingOut = situation({ status: "ready", answerHasText: true, revealing: true });
const done = situation({ status: "ready", composer: { hasText: false, focused: true } });

describe("nextCowState", () => {
  it("stays idle when nothing is happening", () => {
    expect(nextCowState("idle", quiet)).toBe("idle");
  });

  it("listens while the visitor types in the focused composer", () => {
    expect(nextCowState("idle", typing)).toBe("listening");
  });

  it("doesn't listen to text in a composer that lost focus", () => {
    const blurred = situation({ composer: { hasText: true, focused: false } });
    expect(nextCowState("listening", blurred)).toBe("idle");
  });

  it("stops listening when the composer is emptied", () => {
    expect(nextCowState("listening", done)).toBe("idle");
  });

  it("thinks from sending until the first text, through a tool call", () => {
    expect(play(typing, submitted, lookingUp, situation({ status: "streaming" }))).toEqual([
      "listening",
      "thinking",
      "thinking",
      "thinking",
    ]);
  });

  it("talks from the first word on screen, not from the first text that arrives", () => {
    const arrivedNotShown = situation({ status: "streaming", revealing: true });
    expect(play(submitted, arrivedNotShown, streamingText)).toEqual([
      "thinking",
      "thinking",
      "talking",
    ]);
  });

  it("keeps talking while the stream waits, without thinking again", () => {
    // The reveal has caught up and waits for more text, or a later tool runs:
    // a word is on screen and the answer isn't done, so it stays talking.
    expect(play(submitted, streamingText, streamingText, streamingText)).toEqual([
      "thinking",
      "talking",
      "talking",
      "talking",
    ]);
  });

  it("follows the typing, not the stream: talks until the last word, then licks", () => {
    expect(play(submitted, streamingText, typingOut, typingOut, done)).toEqual([
      "thinking",
      "talking",
      "talking",
      "talking",
      "satisfied",
    ]);
  });

  it("thinks until the first word when the stream ends before any is typed", () => {
    const arrivedAllAtOnce = situation({ status: "ready", revealing: true });
    expect(play(submitted, arrivedAllAtOnce, typingOut, done)).toEqual([
      "thinking",
      "thinking",
      "talking",
      "satisfied",
    ]);
  });

  it("is satisfied once the answer finishes, and stays so until the caller ends the lick", () => {
    expect(play(submitted, streamingText, done, done)).toEqual([
      "thinking",
      "talking",
      "satisfied",
      "satisfied",
    ]);
    expect(nextCowState("idle", done)).toBe("idle");
  });

  it("is satisfied when an answer finishes without text", () => {
    expect(play(submitted, lookingUp, done)).toEqual(["thinking", "thinking", "satisfied"]);
  });

  it("stops being satisfied when the visitor starts typing", () => {
    expect(nextCowState("satisfied", typing)).toBe("listening");
  });

  it("goes back to idle without a lick when the visitor stops mid-answer", () => {
    const stopped = situation({ status: "ready", stopped: true });
    expect(play(submitted, streamingText, stopped)).toEqual(["thinking", "talking", "idle"]);
  });

  it("goes back to idle without a lick when the visitor stops before any text", () => {
    const stopped = situation({ status: "ready", stopped: true });
    expect(play(submitted, stopped)).toEqual(["thinking", "idle"]);
  });

  it("is sorry after an error, even one after streaming started", () => {
    const failed = situation({ status: "error" });
    expect(play(submitted, failed)).toEqual(["thinking", "sorry"]);
    expect(play(submitted, streamingText, failed)).toEqual(["thinking", "talking", "sorry"]);
  });

  it("stays sorry while the visitor types after an error", () => {
    const typingAfterError = situation({
      status: "error",
      composer: { hasText: true, focused: true },
    });
    expect(nextCowState("sorry", typingAfterError)).toBe("sorry");
  });

  it("thinks again when a question is sent after an error", () => {
    expect(nextCowState("sorry", submitted)).toBe("thinking");
  });

  it("gives the same state when applied twice to the same situation", () => {
    const states: CowState[] = ["idle", "listening", "thinking", "talking", "satisfied", "sorry"];
    const situations = [quiet, typing, submitted, lookingUp, streamingText, typingOut, done];
    for (const previous of states) {
      for (const now of situations) {
        const once = nextCowState(previous, now);
        expect(nextCowState(once, now)).toBe(once);
      }
    }
  });
});

describe("liveCowSlot", () => {
  const question = { id: "q1", role: "user" };
  const answer = { id: "a1", role: "assistant" };

  it("is the greeting before any answer", () => {
    expect(liveCowSlot("ready", [])).toEqual({ kind: "greeting" });
  });

  it("is a pending row while a question waits for its first chunk", () => {
    expect(liveCowSlot("submitted", [question])).toEqual({ kind: "pending" });
    expect(liveCowSlot("submitted", [question, answer, { id: "q2", role: "user" }])).toEqual({
      kind: "pending",
    });
  });

  it("is the latest answer once one exists", () => {
    const later = { id: "a2", role: "assistant" };
    expect(liveCowSlot("streaming", [question, answer])).toEqual({ kind: "answer", id: "a1" });
    expect(liveCowSlot("ready", [question, answer, question, later])).toEqual({
      kind: "answer",
      id: "a2",
    });
  });

  it("stays on the last answer when a question is stopped before its first chunk", () => {
    expect(liveCowSlot("ready", [question, answer, { id: "q2", role: "user" }])).toEqual({
      kind: "answer",
      id: "a1",
    });
  });

  it("is the error notice after a failure", () => {
    expect(liveCowSlot("error", [question, answer])).toEqual({ kind: "error" });
  });
});
