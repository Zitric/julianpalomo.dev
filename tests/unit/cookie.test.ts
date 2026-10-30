import { describe, expect, it } from "vitest";
import { serializeCookie } from "../../src/lib/cookie";
import { parseLangCookie } from "../../src/lib/i18n/locale";
import { parseThemeCookie } from "../../src/lib/theme";

const ONE_YEAR = 365 * 24 * 60 * 60;

describe("serializeCookie", () => {
  it("remembers a choice for as long as it's told, on every path", () => {
    expect(serializeCookie("lang", "es", { secure: false, maxAge: ONE_YEAR })).toBe(
      "lang=es; Max-Age=31536000; Path=/; SameSite=Lax",
    );
    expect(serializeCookie("theme", "dark.1761789000000", { secure: false, maxAge: 600 })).toBe(
      "theme=dark.1761789000000; Max-Age=600; Path=/; SameSite=Lax",
    );
  });

  it("deletes with Max-Age=0 and the same path", () => {
    expect(serializeCookie("theme", "", { secure: false, maxAge: 0 })).toBe(
      "theme=; Max-Age=0; Path=/; SameSite=Lax",
    );
  });

  it("adds Secure over https", () => {
    expect(serializeCookie("lang", "es", { secure: true, maxAge: ONE_YEAR })).toBe(
      "lang=es; Max-Age=31536000; Path=/; SameSite=Lax; Secure",
    );
  });

  it("writes what the theme and language parsers read back", () => {
    const value = (cookie: string) => cookie.split(";")[0]?.split("=")[1];
    const until = Date.parse("2026-10-28T17:00:00Z");
    const theme = serializeCookie("theme", `dark.${until}`, { secure: false, maxAge: 600 });
    expect(parseThemeCookie(value(theme), until - 600_000)).toEqual({ theme: "dark", until });
    expect(
      parseLangCookie(value(serializeCookie("lang", "es", { secure: false, maxAge: ONE_YEAR }))),
    ).toBe("es");
  });
});
