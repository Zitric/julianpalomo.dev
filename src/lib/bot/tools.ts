/**
 * The assistant's tools. Every one is read-only: it returns pieces of the
 * claims it was built from and never writes, sends or fetches anything.
 * No tool returns `confirmedByJulian`, so the date never reaches the model;
 * the chat endpoint adds it to the UI's sources from `confirmedClaims()`
 * (src/lib/bot/chat.ts), which the UI shows next to the claim.
 */
import { tool } from "ai";
import { z } from "zod";
import type { Claim } from "../claims";

type PublicClaim = Pick<Claim, "id" | "label" | "org" | "source" | "area" | "text">;

function toPublic(claim: Claim): PublicClaim {
  const { id, label, org, source, area, text } = claim;
  return org === undefined
    ? { id, label, source, area, text }
    : { id, label, org, source, area, text };
}

/** How many claims share each value, in the order each value first appears. */
function countBy(values: readonly string[]): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].map(([value, count]) => ({ value, count }));
}

const sameText = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Plain strings, not enums, so an unknown area or org returns no claims instead
// of an error the model has to recover from.
export const getClaimsInput = z.strictObject({
  area: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .optional()
    .describe("A claim area, as list_topics names it."),
  org: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .describe("An organisation, as list_topics names it."),
});

export const searchClaimsInput = z.strictObject({
  query: z.string().trim().min(1).max(100).describe("A few words to look for."),
});

/** Builds the tools over `claims`; the endpoint passes `confirmedClaims()`. */
export function buildTools(claims: readonly Claim[]) {
  return {
    list_topics: tool({
      description:
        "List the claim areas and the organisations that have claims, with a count each. Call this first to see what exists.",
      inputSchema: z.strictObject({}),
      execute: () => ({
        areas: countBy(claims.map((claim) => claim.area)).map(({ value, count }) => ({
          area: value,
          count,
        })),
        orgs: countBy(claims.flatMap((claim) => (claim.org === undefined ? [] : [claim.org]))).map(
          ({ value, count }) => ({ org: value, count }),
        ),
      }),
    }),

    get_claims: tool({
      description:
        "Get the claims in an area, for an organisation, or both. With neither, get every claim. Returns an empty list when nothing matches.",
      inputSchema: getClaimsInput,
      execute: ({ area, org }) => ({
        claims: claims
          .filter((claim) => area === undefined || sameText(claim.area, area))
          .filter(
            (claim) => org === undefined || (claim.org !== undefined && sameText(claim.org, org)),
          )
          .map(toPublic),
      }),
    }),

    search_claims: tool({
      description:
        "Find claims whose text, label or organisation contains any of the query's words, ignoring case. Returns an empty list when nothing matches.",
      inputSchema: searchClaimsInput,
      execute: ({ query }) => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        return {
          claims: claims
            .filter((claim) => {
              const haystack = [claim.text, claim.label, claim.org ?? ""].join("\n").toLowerCase();
              return words.some((word) => haystack.includes(word));
            })
            .map(toPublic),
        };
      },
    }),
  };
}
