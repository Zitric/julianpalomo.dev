/**
 * Citation markers in the assistant's answers, and the labels of the sources
 * they point to. This is the one place markers are understood: the server
 * uses it to check an answer, and the chat UI to render it.
 *
 * A marker is `[[claim-id]]`. It counts only when its id is in the allowed
 * set, which holds the claims a tool returned while producing the answer.
 */
import { CLAIM_ID_PATTERN } from "../claim-id";
import type { Claim } from "../claims";

/** What the UI needs to show a claim as a source chip. */
export type Source = Pick<Claim, "id" | "label" | "org" | "source">;

type Segment = { type: "text"; text: string } | { type: "citation"; id: string };

const MARKER = new RegExp(`\\[\\[(${CLAIM_ID_PATTERN.source})\\]\\]`, "g");

/**
 * Splits an answer into text and citations. A marker whose id isn't allowed
 * is dropped from the text and listed in `invalid`, once, in order. Anything
 * that isn't a well-formed marker stays as text.
 */
export function parseCitations(
  text: string,
  allowedIds: ReadonlySet<string>,
): { segments: Segment[]; invalid: string[] } {
  const segments: Segment[] = [];
  const invalid: string[] = [];
  let pending = "";
  let last = 0;

  for (const match of text.matchAll(MARKER)) {
    const id = match[1] ?? "";
    pending += text.slice(last, match.index);
    last = match.index + match[0].length;
    if (allowedIds.has(id)) {
      if (pending) segments.push({ type: "text", text: pending });
      pending = "";
      segments.push({ type: "citation", id });
    } else if (!invalid.includes(id)) {
      invalid.push(id);
    }
  }

  pending += text.slice(last);
  if (pending) segments.push({ type: "text", text: pending });
  return { segments, invalid };
}

/**
 * The chip text: "CV · Cazoo · Redux → Zustand", or "Julian · Right to work"
 * without an org. The source's name comes in the page's language; the claim's
 * org and label are English, like every claim.
 */
export function chipLabel(source: Source, names: Record<Source["source"], string>): string {
  return [names[source.source], source.org, source.label]
    .filter((part) => part !== undefined)
    .join(" · ");
}
