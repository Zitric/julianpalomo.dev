/**
 * The one piece of the Workers runtime the app imports. Written by hand
 * instead of generated with `wrangler types` (docs/tech-debt.md): `env` holds
 * vars, secrets and bindings, typed as unknown so every value is parsed where
 * it's read.
 */
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
