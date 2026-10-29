/**
 * What the home page tells link previews and search engines (DESIGN.md,
 * "Sharing"): the Open Graph and Twitter card tags, the canonical and
 * language links, and a JSON-LD `Person`. Every URL is absolute and points at
 * production, never at a preview host, so a shared link always shows the
 * live site.
 */
import type { Locale } from "./i18n/locale";
import { t } from "./i18n/t";
import { pageTitle, site } from "./site";

/** The preview images' size (public/og/), written by `pnpm og`. */
export const OG_IMAGE = { width: 1200, height: 630 } as const;

const OG_LOCALE: Record<Locale, string> = { en: "en_GB", es: "es_ES" };

/** The home page's own URL: `/` in English, `/es` in Spanish. */
export function pageUrl(locale: Locale): string {
  return locale === "es" ? `${site.url}/es` : `${site.url}/`;
}

/** The home page's `head` in `locale`: its meta tags, links and JSON-LD. */
export function shareHead(locale: Locale) {
  const title = pageTitle(undefined, { name: t(locale, "name"), role: t(locale, "role") });
  const description = t(locale, "metaDescription");
  const url = pageUrl(locale);
  const image = `${site.url}/og/${locale}.png`;
  const alt = t(locale, "ogImageAlt");
  const other: Locale = locale === "es" ? "en" : "es";
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:site_name", content: site.name },
      { property: "og:type", content: "profile" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:locale", content: OG_LOCALE[locale] },
      { property: "og:locale:alternate", content: OG_LOCALE[other] },
      { property: "og:image", content: image },
      { property: "og:image:width", content: String(OG_IMAGE.width) },
      { property: "og:image:height", content: String(OG_IMAGE.height) },
      { property: "og:image:alt", content: alt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: image },
      { name: "twitter:image:alt", content: alt },
    ],
    links: [
      { rel: "canonical", href: url },
      { rel: "alternate", hrefLang: "en", href: pageUrl("en") },
      { rel: "alternate", hrefLang: "es", href: pageUrl("es") },
      { rel: "alternate", hrefLang: "x-default", href: pageUrl("en") },
    ],
    scripts: [
      {
        type: "application/ld+json",
        // `<` escaped, so no text in it could ever close the script tag.
        children: JSON.stringify(person()).replaceAll("<", "\\u003c"),
      },
    ],
  };
}

/**
 * Julian as a schema.org `Person`. The same on both pages, so search engines
 * see one person: the Spanish spelling of his name is an alternate. No email,
 * telephone or address (AGENTS.md section 1).
 */
export function person() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    alternateName: t("es", "name"),
    jobTitle: site.role,
    url: pageUrl("en"),
    image: `${site.url}/images/julian.png`,
    sameAs: [site.links.linkedin, site.links.github],
  };
}
