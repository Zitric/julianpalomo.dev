import { describe, expect, it } from "vitest";
import { pageTitle, site } from "../../src/lib/site";

describe("pageTitle", () => {
  it("uses the name and role on the home page", () => {
    expect(pageTitle()).toBe(`${site.name} · ${site.role}`);
  });

  it("puts the page first on any other page", () => {
    expect(pageTitle("Experience")).toBe(`Experience · ${site.name}`);
  });

  it("treats a blank page label as the home page", () => {
    expect(pageTitle("   ")).toBe(pageTitle());
  });
});
