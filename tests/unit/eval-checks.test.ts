import { describe, expect, it } from "vitest";
import type { Expectation } from "../../evals/cases";
import { type Answer, checkAnswer } from "../../evals/checks";
import { STREAM_ERROR_TEXT } from "../../src/lib/bot/chat";
import { site } from "../../src/lib/site";

/** An answer that passes every check for an `answered` case. */
function answer(overrides: Partial<Answer> = {}): Answer {
  return {
    status: 200,
    text: "He was a Senior Frontend Engineer at Cazoo. [[cazoo-role]]",
    sourceIds: ["cazoo-role", "cazoo-context"],
    streamError: undefined,
    ...overrides,
  };
}

const answered: Expectation = { outcome: "answered" };

/** The result of the check called `name`, which must have run. */
function result(checks: ReturnType<typeof checkAnswer>, name: string) {
  const found = checks.find((check) => check.name === name);
  if (found === undefined) throw new Error(`no check called ${name}`);
  return found;
}

function passes(name: string, given: Answer, expectation: Expectation = answered) {
  return result(checkAnswer(given, expectation), name).pass;
}

describe("checkAnswer", () => {
  it("passes a cited answer on every check", () => {
    expect(checkAnswer(answer(), answered).every((check) => check.pass)).toBe(true);
  });

  it("fails a non-200 response on its status alone, never as an empty answer", () => {
    const checks = checkAnswer(answer({ status: 429, text: "" }), answered);
    expect(checks).toEqual([
      { name: "status", pass: false, reason: "the endpoint answered 429, not 200" },
    ]);
  });

  it("fails an empty answer, the stream error text and a stream error", () => {
    expect(passes("not-empty", answer())).toBe(true);
    expect(passes("not-empty", answer({ text: "  " }))).toBe(false);
    expect(passes("not-empty", answer({ text: STREAM_ERROR_TEXT }))).toBe(false);
    const failed = result(checkAnswer(answer({ streamError: "boom" }), answered), "not-empty");
    expect(failed).toMatchObject({ pass: false, reason: "the stream failed: boom" });
  });

  it("fails a citation that isn't in the answer's sources", () => {
    expect(passes("valid-citations", answer())).toBe(true);
    const failed = result(
      checkAnswer(answer({ sourceIds: ["cazoo-context"] }), answered),
      "valid-citations",
    );
    expect(failed).toMatchObject({ pass: false, reason: expect.stringContaining("cazoo-role") });
  });

  // The numbers are joined at runtime so no phone-shaped string sits in the repo.
  it.each([
    ["an email address", ["Write to julian", "example.com."].join("@")],
    ["a UK phone number", `Call ${["077", "00 9", "00123"].join("")}.`],
    ["an international phone number", `Call ${["+44 (0)20", "7946", "0958"].join(" ")}.`],
  ])("fails %s as contact details", (_name, text) => {
    expect(passes("no-contact-details", answer({ text }))).toBe(false);
  });

  it("doesn't take years or figures for a phone number", () => {
    const text =
      "Computer Engineering, 2002 – 2009, then 2014-2017; ~250,000 vehicles and 500–700k users. [[cazoo-role]]";
    expect(passes("no-contact-details", answer({ text }))).toBe(true);
  });

  it.each([
    ["a heading", "# Cazoo\nHe worked there."],
    ["a list item", "At Cazoo:\n- he upgraded React"],
    ["a numbered list", "1. React\n2. Zustand"],
    ["bold", "He was **senior**."],
    ["code", "He used `use()`."],
    ["a link", "See [LinkedIn](https://www.linkedin.com)."],
  ])("fails %s as Markdown", (_name, text) => {
    expect(passes("no-markdown", answer({ text }))).toBe(false);
  });

  it("doesn't take a citation marker or a bare URL for Markdown", () => {
    const text = `He was at Cazoo [[cazoo-role]]. More on ${site.links.linkedin}.`;
    expect(passes("no-markdown", answer({ text }))).toBe(true);
  });

  describe("outcome", () => {
    it("needs a valid citation for an answer", () => {
      expect(passes("outcome", answer())).toBe(true);
      expect(passes("outcome", answer({ text: "He worked at Cazoo." }))).toBe(false);
    });

    it("needs the LinkedIn or GitHub link when not covered", () => {
      const notCovered: Expectation = { outcome: "not_covered" };
      const linked = `The claims don't cover that. Try ${site.links.github}.`;
      expect(passes("outcome", answer({ text: linked }), notCovered)).toBe(true);
      expect(passes("outcome", answer({ text: "The claims don't cover that." }), notCovered)).toBe(
        false,
      );
    });

    it("needs nothing more for a decline", () => {
      const declined: Expectation = { outcome: "declined" };
      expect(passes("outcome", answer({ text: "I can't share that." }), declined)).toBe(true);
    });
  });

  describe("cite-any-of", () => {
    it("needs one of the ids cited for an answer", () => {
      const expectation: Expectation = { outcome: "answered", citeAnyOf: ["cazoo-role"] };
      expect(passes("cite-any-of", answer(), expectation)).toBe(true);
      const other = answer({ text: "A marketplace. [[cazoo-context]]" });
      expect(passes("cite-any-of", other, expectation)).toBe(false);
    });

    it("lists the only ids a 'not covered' answer may cite, and allows none without it", () => {
      const text = `Not covered; see ${site.links.linkedin}. His skills: [[cazoo-role]]`;
      const allowed: Expectation = { outcome: "not_covered", citeAnyOf: ["cazoo-role"] };
      expect(passes("cite-any-of", answer({ text }), allowed)).toBe(true);
      expect(passes("cite-any-of", answer({ text }), { outcome: "not_covered" })).toBe(false);
    });
  });

  it("fails an answer that cites an id it must never cite", () => {
    const expectation: Expectation = { outcome: "answered", neverCite: ["cazoo-role"] };
    expect(passes("never-cite", answer(), expectation)).toBe(false);
    const other = answer({ text: "A marketplace. [[cazoo-context]]" });
    expect(passes("never-cite", other, expectation)).toBe(true);
  });

  it("matches mustMatch and mustNotMatch case-insensitively", () => {
    const expectation: Expectation = {
      outcome: "answered",
      mustMatch: ["senior frontend"],
      mustNotMatch: ["staff engineer"],
    };
    expect(passes("must-match /senior frontend/", answer(), expectation)).toBe(true);
    expect(passes("must-not-match /staff engineer/", answer(), expectation)).toBe(true);
    const wrong = answer({ text: "He was a Staff Engineer. [[cazoo-role]]" });
    expect(passes("must-match /senior frontend/", wrong, expectation)).toBe(false);
    expect(passes("must-not-match /staff engineer/", wrong, expectation)).toBe(false);
  });
});
