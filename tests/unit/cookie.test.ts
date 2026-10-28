import { describe, expect, it } from "vitest";
import { serializeCookie } from "../../src/lib/cookie";
import { parseLangCookie } from "../../src/lib/i18n/locale";
import { parseThemeCookie } from "../../src/lib/theme";

describe("serializeCookie", () => {
  it("remembers the choice for a year on every path", () => {
    expect(serializeCookie("theme", "dark", { secure: false })).toBe(
      "theme=dark; Max-Age=31536000; Path=/; SameSite=Lax",
    );
  });

  it("adds Secure over https", () => {
    expect(serializeCookie("lang", "es", { secure: true })).toBe(
      "lang=es; Max-Age=31536000; Path=/; SameSite=Lax; Secure",
    );
  });

  it("writes what the theme and language parsers read back", () => {
    const value = (cookie: string) => cookie.split(";")[0]?.split("=")[1];
    expect(parseThemeCookie(value(serializeCookie("theme", "dark", { secure: false })))).toBe(
      "dark",
    );
    expect(parseLangCookie(value(serializeCookie("lang", "es", { secure: false })))).toBe("es");
  });
});
