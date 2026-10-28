const ONE_YEAR = 365 * 24 * 60 * 60;

/** A cookie that remembers a visitor's choice for a year on every path. */
export function serializeCookie(
  name: string,
  value: string,
  { secure }: { secure: boolean },
): string {
  const attributes = [`${name}=${value}`, `Max-Age=${ONE_YEAR}`, "Path=/", "SameSite=Lax"];
  if (secure) attributes.push("Secure");
  return attributes.join("; ");
}

/** Stores a visitor's choice from the browser, `Secure` over https. */
export function rememberChoice(name: string, value: string): void {
  // biome-ignore lint/suspicious/noDocumentCookie: the Cookie Store API isn't in every browser the site supports; serializeCookie builds the string and is unit-tested.
  document.cookie = serializeCookie(name, value, { secure: location.protocol === "https:" });
}
