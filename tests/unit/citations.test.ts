import { describe, expect, it } from "vitest";
import { chipLabel, parseCitations } from "../../src/lib/bot/citations";

const allowed = new Set(["redux-zustand", "right-to-work"]);

describe("parseCitations", () => {
  it("turns valid markers into citations", () => {
    expect(parseCitations("Moved state to Zustand.[[redux-zustand]] Done.", allowed)).toEqual({
      segments: [
        { type: "text", text: "Moved state to Zustand." },
        { type: "citation", id: "redux-zustand" },
        { type: "text", text: " Done." },
      ],
      invalid: [],
    });
  });

  it("removes a marker with an unknown id and reports it once", () => {
    expect(parseCitations("He knows Rust.[[rust]] And Go.[[rust]]", allowed)).toEqual({
      segments: [{ type: "text", text: "He knows Rust. And Go." }],
      invalid: ["rust"],
    });
  });

  it("keeps adjacent markers apart and in order", () => {
    expect(parseCitations("Both.[[redux-zustand]][[right-to-work]]", allowed).segments).toEqual([
      { type: "text", text: "Both." },
      { type: "citation", id: "redux-zustand" },
      { type: "citation", id: "right-to-work" },
    ]);
  });

  it("drops an invalid marker between two valid ones", () => {
    expect(parseCitations("[[redux-zustand]][[made-up]][[right-to-work]]", allowed)).toEqual({
      segments: [
        { type: "citation", id: "redux-zustand" },
        { type: "citation", id: "right-to-work" },
      ],
      invalid: ["made-up"],
    });
  });

  it("handles a marker at the start and at the end", () => {
    expect(parseCitations("[[right-to-work]] Yes.[[redux-zustand]]", allowed).segments).toEqual([
      { type: "citation", id: "right-to-work" },
      { type: "text", text: " Yes." },
      { type: "citation", id: "redux-zustand" },
    ]);
  });

  it.each(["[[Bad Id]]", "[[a", "[a]", "[[]]", "[[redux_zustand]]"])(
    "leaves the malformed marker %j as text",
    (marker) => {
      expect(parseCitations(`See ${marker} here.`, allowed)).toEqual({
        segments: [{ type: "text", text: `See ${marker} here.` }],
        invalid: [],
      });
    },
  );

  it("returns text with no markers unchanged", () => {
    expect(parseCitations("No sources here.", allowed)).toEqual({
      segments: [{ type: "text", text: "No sources here." }],
      invalid: [],
    });
  });

  it("returns no segments for empty text", () => {
    expect(parseCitations("", allowed)).toEqual({ segments: [], invalid: [] });
  });
});

describe("chipLabel", () => {
  const names = { cv: "CV", julian: "Julian" };

  it("joins source, org and label", () => {
    expect(chipLabel({ source: "cv", org: "Cazoo", label: "Redux → Zustand" }, names)).toBe(
      "CV · Cazoo · Redux → Zustand",
    );
  });

  it("leaves the org out when the claim has none", () => {
    expect(chipLabel({ source: "julian", label: "Right to work" }, names)).toBe(
      "Julian · Right to work",
    );
  });

  it("names the source in the page's language and keeps the claim's own words", () => {
    expect(
      chipLabel({ source: "julian", label: "Right to work" }, { cv: "CV", julian: "Julián" }),
    ).toBe("Julián · Right to work");
  });
});
