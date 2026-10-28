export const site = {
  name: "Julian Palomo",
  role: "Senior Frontend | Full-stack Engineer",
  url: "https://julianpalomo.dev",
  links: {
    linkedin: "https://www.linkedin.com/in/julianpalomodeonis",
    github: "https://github.com/Zitric",
  },
} as const;

/**
 * The document title: name and role on the home page, "Page · Name" on any
 * other page. `name` is the page language's spelling ("Julián" in Spanish).
 */
export function pageTitle(page?: string, name: string = site.name): string {
  const label = page?.trim();
  return label ? `${label} · ${name}` : `${name} · ${site.role}`;
}
