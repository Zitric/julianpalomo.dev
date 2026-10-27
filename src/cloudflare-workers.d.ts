/**
 * The two pieces of the Workers runtime the app imports. Written by hand
 * instead of generated with `wrangler types` (docs/tech-debt.md): `env` holds
 * vars, secrets and bindings, typed as unknown so every value is parsed where
 * it's read.
 */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
  /** Extends the request until `promise` settles, for up to 30 seconds after the response ends or the client disconnects. */
  export function waitUntil(promise: Promise<unknown>): void;
}
