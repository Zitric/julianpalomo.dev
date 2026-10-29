import { describe, expect, it } from "vitest";
import { t } from "../../src/lib/i18n/t";
import { OG_IMAGE, pageUrl, person, shareHead } from "../../src/lib/share";
import { pageTitle, site } from "../../src/lib/site";

type Tag = { title?: string; name?: string; property?: string; content?: string };

function content(meta: Tag[], key: string): string | undefined {
  return meta.find((tag) => tag.property === key || tag.name === key)?.content;
}

describe("shareHead", () => {
  it.each([
    ["en", "https://julianpalomo.dev/", "en_GB", "es_ES"],
    ["es", "https://julianpalomo.dev/es", "es_ES", "en_GB"],
  ] as const)("in %s, points at its own page and image", (locale, url, ogLocale, alternate) => {
    const { meta, links } = shareHead(locale);
    expect(content(meta, "og:url")).toBe(url);
    expect(links).toContainEqual({ rel: "canonical", href: url });
    expect(content(meta, "og:image")).toBe(`https://julianpalomo.dev/og/${locale}.png`);
    expect(content(meta, "twitter:image")).toBe(content(meta, "og:image"));
    expect(content(meta, "og:locale")).toBe(ogLocale);
    expect(content(meta, "og:locale:alternate")).toBe(alternate);
    expect(content(meta, "og:image:alt")).toBe(t(locale, "ogImageAlt"));
    expect(content(meta, "twitter:image:alt")).toBe(t(locale, "ogImageAlt"));
  });

  it.each(["en", "es"] as const)("in %s, reuses the page's title and description", (locale) => {
    const { meta } = shareHead(locale);
    const title = pageTitle(undefined, { name: t(locale, "name"), role: t(locale, "role") });
    expect(meta).toContainEqual({ title });
    expect(content(meta, "og:title")).toBe(title);
    expect(content(meta, "twitter:title")).toBe(title);
    for (const key of ["description", "og:description", "twitter:description"]) {
      expect(content(meta, key)).toBe(t(locale, "metaDescription"));
    }
  });

  it("describes a large-image profile card", () => {
    const { meta } = shareHead("en");
    expect(content(meta, "og:type")).toBe("profile");
    expect(content(meta, "og:site_name")).toBe(site.name);
    expect(content(meta, "twitter:card")).toBe("summary_large_image");
    expect(content(meta, "og:image:width")).toBe(String(OG_IMAGE.width));
    expect(content(meta, "og:image:height")).toBe(String(OG_IMAGE.height));
  });

  it("uses only absolute production URLs", () => {
    for (const locale of ["en", "es"] as const) {
      const { meta, links } = shareHead(locale);
      const urls = [
        ...meta.filter((tag) => tag.content?.includes("/")).map((tag) => tag.content ?? ""),
        ...links.map((link) => link.href),
      ].filter((value) => !value.includes(" "));
      expect(urls.length).toBeGreaterThan(4);
      for (const url of urls) expect(url.startsWith(site.url)).toBe(true);
    }
  });

  it("links both languages from either page", () => {
    for (const locale of ["en", "es"] as const) {
      expect(shareHead(locale).links).toEqual(
        expect.arrayContaining([
          { rel: "alternate", hrefLang: "en", href: pageUrl("en") },
          { rel: "alternate", hrefLang: "es", href: pageUrl("es") },
          { rel: "alternate", hrefLang: "x-default", href: pageUrl("en") },
        ]),
      );
    }
  });
});

describe("person", () => {
  it("is the same valid JSON-LD Person on both pages", () => {
    const [en] = shareHead("en").scripts;
    const [es] = shareHead("es").scripts;
    expect(en?.type).toBe("application/ld+json");
    expect(en?.children).toBe(es?.children);
    expect(JSON.parse(en?.children ?? "")).toEqual(person());
  });

  it("names Julian, with the Spanish spelling as an alternate, and links his profiles", () => {
    expect(person()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Julian Palomo",
      alternateName: "Julián Palomo",
      jobTitle: site.role,
      url: "https://julianpalomo.dev/",
      image: "https://julianpalomo.dev/images/julian.png",
      sameAs: [site.links.linkedin, site.links.github],
    });
  });

  it("holds no contact details", () => {
    const keys = Object.keys(person());
    for (const key of ["email", "telephone", "address"]) expect(keys).not.toContain(key);
  });
});
