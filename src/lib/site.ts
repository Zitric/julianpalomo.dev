export const site = {
  name: "Julian Palomo",
  role: "Senior Software Engineer",
  url: "https://julianpalomo.dev",
  links: {
    linkedin: "https://www.linkedin.com/in/julianpalomo",
    github: "https://github.com/Zitric",
  },
} as const;

/**
 * The document title: name and role on the home page, "Page · Name" on any
 * other page. `who` is the page language's name and role ("Julián" in Spanish).
 */
export function pageTitle(
  page?: string,
  who: { name: string; role: string } = { name: site.name, role: site.role },
): string {
  const label = page?.trim();
  return label ? `${label} · ${who.name}` : `${who.name} · ${who.role}`;
}
