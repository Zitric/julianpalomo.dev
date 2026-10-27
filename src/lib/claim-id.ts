/**
 * What a claim id looks like: kebab-case, lowercase letters and digits. It
 * lives apart from claims.ts so browser code can use it without importing
 * the claims data.
 */
export const CLAIM_ID_PATTERN = /[a-z0-9]+(?:-[a-z0-9]+)*/;
