import { describe, expect, it } from "vitest";
import { en } from "../../src/lib/i18n/en";
import { es } from "../../src/lib/i18n/es";
import { t } from "../../src/lib/i18n/t";

/** Every string in a dictionary, with its path, including those inside lists and objects. */
function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") return [[path, String(value(1, 1000))]];
  if (Array.isArray(value))
    return value.flatMap((item, index) => strings(item, `${path}[${index}]`));
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([key, item]) => strings(item, `${path}.${key}`));
  return [];
}

describe("the Spanish strings", () => {
  it("has exactly the English keys", () => {
    expect(strings(es, "es").map(([path]) => path.slice(3))).toEqual(
      strings(en, "en").map(([path]) => path.slice(3)),
    );
  });

  it.each(strings(es, "es"))("fills %s", (_path, text) => {
    expect(text.trim()).not.toBe("");
  });
});

describe("t", () => {
  it("returns the page's language", () => {
    expect(t("en", "name")).toBe("Julian Palomo");
    expect(t("es", "name")).toBe("Julián Palomo");
    expect(t("es", "send")).toBe("Enviar");
  });

  it("formats numbers for the page's language", () => {
    expect(t("en", "counterOver")(1, 1000)).toBe("1 character over the 1,000 limit");
    expect(t("es", "counterOver")(2, 1000)).toBe("2 caracteres por encima del límite de 1000");
  });
});
