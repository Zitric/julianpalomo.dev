/**
 * Claims: short statements about Julian's experience, each approved by him.
 * This is the only module that reads `src/content/claims.json`; everything
 * else goes through `confirmedClaims()`, so an unconfirmed claim never leaves
 * this file. The reasons are in
 * docs/adr/2026-10-26-answers-only-from-confirmed-claims.md.
 */
import { z } from "zod";
import data from "../content/claims.json";
import { CLAIM_ID_PATTERN } from "./claim-id";

/** Today's date in UTC as YYYY-MM-DD, which sorts and compares as a string. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// Strict on purpose: a misspelt `confirmedByJulian` must fail, not read as an
// unconfirmed claim with an extra field.
const claimSchema = z.strictObject({
  id: z.string().regex(new RegExp(`^${CLAIM_ID_PATTERN.source}$`), "id must be kebab-case"),
  label: z.string().trim().min(1),
  text: z.string().trim().min(1),
  area: z.enum(["profile", "role", "experience", "project", "skill", "education", "certification"]),
  org: z.string().trim().min(1).optional(),
  source: z.enum(["cv", "julian"]),
  confirmedByJulian: z.iso
    .date()
    .refine((date) => date <= todayUtc(), "confirmedByJulian can't be in the future")
    .nullable(),
});

const claimsSchema = z.array(claimSchema).superRefine((claims, ctx) => {
  const seen = new Set<string>();
  claims.forEach((claim, index) => {
    if (seen.has(claim.id)) {
      ctx.addIssue({ code: "custom", message: `duplicate id "${claim.id}"`, path: [index, "id"] });
    }
    seen.add(claim.id);
  });
});

export type Claim = z.infer<typeof claimSchema>;

/** Validates raw claims data; throws with Zod's message when it's invalid. */
export function parseClaims(input: unknown): Claim[] {
  return claimsSchema.parse(input);
}

/** The claims Julian has dated, in file order. */
export function keepConfirmed(claims: readonly Claim[]): Claim[] {
  return claims.filter((claim) => claim.confirmedByJulian !== null);
}

// Parsed on first use, inside a request, never at module load. In Workers,
// `Date` at load time isn't the current time, so the "not in the future" check
// would reject every confirmed claim and every request would fail. An invalid
// file still fails `pnpm test`: tests/unit/claims.test.ts parses it directly.
let confirmed: readonly Claim[] | undefined;

/**
 * The only way callers get claims: confirmed ones, never the rest. Typed
 * read-only so callers treat the list as shared data, not something to edit.
 */
export function confirmedClaims(): readonly Claim[] {
  confirmed ??= keepConfirmed(parseClaims(data));
  return confirmed;
}
