/** How long the language choice is remembered, in seconds. */
const ONE_YEAR = 365 * 24 * 60 * 60;

/**
 * A cookie on every path, for `maxAge` seconds; 0 deletes it. A delete must
 * carry the same path (and no domain) as the cookie it replaces, or the
 * browser keeps the old one: every cookie here is host-only on `/`.
 */
export function serializeCookie(
  name: string,
  value: string,
  { secure, maxAge }: { secure: boolean; maxAge: number },
): string {
  const attributes = [`${name}=${value}`, `Max-Age=${maxAge}`, "Path=/", "SameSite=Lax"];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

/** Stores a visitor's choice from the browser, `Secure` over https, for a year unless told otherwise. */
export function rememberChoice(name: string, value: string, maxAge = ONE_YEAR): void {
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API isn't in every browser the site supports; serializeCookie builds the string and is unit-tested.
  document.cookie = serializeCookie(name, value, {
    secure: location.protocol === "https:",
    maxAge,
  });
}

/** Deletes a choice stored with rememberChoice. */
export function forgetChoice(name: string): void {
  rememberChoice(name, "", 0);
}
