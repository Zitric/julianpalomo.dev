import { describe, expect, it } from "vitest";
import {
  chooseLanguage,
  type Locale,
  localeFromParam,
  localeFromPath,
  paramFromLocale,
  parseLangCookie,
} from "../../src/lib/i18n/locale";

describe("chooseLanguage", () => {
  const cases: [cookie: Locale | null, country: string | null, expected: Locale][] = [
    ["en", "ES", "en"],
    ["en", "GB", "en"],
    ["en", null, "en"],
    ["es", "ES", "es"],
    ["es", "GB", "es"],
    ["es", null, "es"],
    [null, "ES", "es"],
    [null, "GB", "en"],
    [null, null, "en"],
  ];

  it.each(cases)("with cookie %s and country %s, picks %s", (cookie, country, expected) => {
    expect(chooseLanguage({ cookie, country })).toBe(expected);
  });
});

describe("parseLangCookie", () => {
  it("reads en and es", () => {
    expect(parseLangCookie("en")).toBe("en");
    expect(parseLangCookie("es")).toBe("es");
  });

  it("treats a missing or unknown value as no choice", () => {
    expect(parseLangCookie(undefined)).toBeNull();
    expect(parseLangCookie("")).toBeNull();
    expect(parseLangCookie("ES")).toBeNull();
    expect(parseLangCookie("fr")).toBeNull();
  });
});

describe("the locale route parameter", () => {
  it("is absent for English and es for Spanish", () => {
    expect(paramFromLocale("en")).toBeUndefined();
    expect(paramFromLocale("es")).toBe("es");
  });

  it("reads back the locale it was made from", () => {
    expect(localeFromParam(paramFromLocale("en"))).toBe("en");
    expect(localeFromParam(paramFromLocale("es"))).toBe("es");
  });
});

describe("localeFromPath", () => {
  it("is Spanish under /es and English everywhere else", () => {
    expect(localeFromPath("/es")).toBe("es");
    expect(localeFromPath("/es/")).toBe("es");
    expect(localeFromPath("/")).toBe("en");
    expect(localeFromPath("/essay")).toBe("en");
    expect(localeFromPath("/api/chat")).toBe("en");
  });
});
