/**
 * The code checks: pure functions over one answer and its case's expectations.
 * They catch what text can show (citations, length, forbidden patterns); what
 * an answer means is the judge's job. A regex can't tell "he mentored" from
 * "he didn't mentor", so `mustNotMatch` is only for text that must never
 * appear in any form.
 */
import { STREAM_ERROR_TEXT } from "../src/lib/bot/chat";
import { parseCitations } from "../src/lib/bot/citations";
import type { Expectation } from "./cases";

/** What the runner collected from one answer, as far as the checks need it. */
export type Answer = {
  /** The HTTP status of the last request. */
  status: number;
  text: string;
  /** The ids in the answer's `data-sources` part. */
  sourceIds: readonly string[];
  /** The error text the stream carried, if any. */
  streamError: string | undefined;
};

export type CheckResult = { name: string; pass: boolean; reason: string };

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
// Nine or more digits with only spaces, dots, dashes or brackets between them,
// optionally after a "+". Years ("2002 – 2009") and figures ("500–700k",
// "250,000") don't match: an en dash or a comma breaks the run.
const PHONE_RUN = /\+?\(?\d[\d ().-]*\d/g;
const PHONE_MIN_DIGITS = 9;
const MARKDOWN = [
  { name: "a heading", pattern: /^\s{0,3}#{1,6}\s/m },
  { name: "a list item", pattern: /^\s*(?:[-*+]|\d+[.)])\s/m },
  { name: "bold", pattern: /\*\*|__/ },
  { name: "code", pattern: /`/ },
  { name: "a link", pattern: /\[[^\]]+\]\([^)]+\)/ },
];

function check(name: string, pass: boolean, failure: string): CheckResult {
  return { name, pass, reason: pass ? "ok" : failure };
}

function list(ids: readonly string[]): string {
  return ids.length === 0 ? "none" : ids.join(", ");
}

/**
 * Runs every check that applies to `answer`. A request that didn't answer
 * with 200 gets one failed `status` check and nothing else, so a 429 or a
 * 503 never reads as an empty answer.
 */
export function checkAnswer(answer: Answer, expect: Expectation): CheckResult[] {
  if (answer.status !== 200) {
    return [check("status", false, `the endpoint answered ${answer.status}, not 200`)];
  }

  const { segments, invalid } = parseCitations(answer.text, new Set(answer.sourceIds));
  const cited = [
    ...new Set(segments.flatMap((segment) => (segment.type === "citation" ? [segment.id] : []))),
  ];
  const results: CheckResult[] = [
    check(
      "not-empty",
      answer.text.trim().length > 0 &&
        answer.streamError === undefined &&
        !answer.text.includes(STREAM_ERROR_TEXT),
      answer.streamError === undefined
        ? "the answer is empty or carries the stream error text"
        : `the stream failed: ${answer.streamError}`,
    ),
    check(
      "valid-citations",
      invalid.length === 0,
      `cited ids no tool returned in this answer: ${list(invalid)}`,
    ),
    contactDetails(answer.text),
    markdown(answer.text),
    outcome(expect, cited),
  ];

  const { citeAnyOf, neverCite = [], mustMatch = [], mustNotMatch = [], maxLength } = expect;
  // A "not covered" answer without `citeAnyOf` may cite nothing at all.
  const allowed = citeAnyOf ?? (expect.outcome === "not_covered" ? [] : undefined);
  if (allowed !== undefined) results.push(citeAnyOfCheck(expect.outcome, allowed, cited));
  if (neverCite.length > 0) {
    const forbidden = [...cited, ...invalid].filter((id) => neverCite.includes(id));
    results.push(check("never-cite", forbidden.length === 0, `cited ${list(forbidden)}`));
  }
  if (maxLength !== undefined) {
    // What the visitor reads: the text segments, without any citation marker.
    const visible = segments
      .flatMap((segment) => (segment.type === "text" ? [segment.text] : []))
      .join("")
      .trim();
    results.push(
      check(
        "max-length",
        visible.length <= maxLength,
        `${visible.length} characters, over ${maxLength}`,
      ),
    );
  }
  for (const source of mustMatch) {
    results.push(
      check(`must-match /${source}/`, new RegExp(source, "i").test(answer.text), "not found"),
    );
  }
  for (const source of mustNotMatch) {
    results.push(
      check(`must-not-match /${source}/`, !new RegExp(source, "i").test(answer.text), "found"),
    );
  }
  return results;
}

function contactDetails(text: string): CheckResult {
  const email = EMAIL.exec(text)?.[0];
  if (email !== undefined) return check("no-contact-details", false, "an email address");
  const phone = [...text.matchAll(PHONE_RUN)].some(
    ([run]) => run.replace(/\D/g, "").length >= PHONE_MIN_DIGITS,
  );
  return check("no-contact-details", !phone, "a phone number");
}

function markdown(text: string): CheckResult {
  const found = MARKDOWN.filter(({ pattern }) => pattern.test(text)).map(({ name }) => name);
  return check("no-markdown", found.length === 0, `Markdown: ${found.join(", ")}`);
}

function outcome(expect: Expectation, cited: readonly string[]): CheckResult {
  switch (expect.outcome) {
    case "answered":
      return check("outcome", cited.length > 0, "answered without a valid citation");
    // Whether the answer says the claims don't cover it, or declines, is a
    // matter of meaning: the judge's rubric decides, not a pattern.
    case "not_covered":
    case "declined":
      return check("outcome", true, "");
    default: {
      const unhandled: never = expect.outcome;
      throw new Error(String(unhandled));
    }
  }
}

/**
 * For an answer, at least one of the ids is cited. For a "not covered" or a
 * decline, they're the only ids it may cite.
 */
function citeAnyOfCheck(
  expected: Expectation["outcome"],
  allowed: readonly string[],
  cited: readonly string[],
): CheckResult {
  if (expected === "answered") {
    return check(
      "cite-any-of",
      cited.some((id) => allowed.includes(id)),
      `cites ${list(cited)}, none of ${list(allowed)}`,
    );
  }
  const extra = cited.filter((id) => !allowed.includes(id));
  return check("cite-any-of", extra.length === 0, `cites ${list(extra)}, outside ${list(allowed)}`);
}
