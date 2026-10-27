export const site = {
  name: "Julian Palomo",
  role: "Senior Frontend | Full-stack Engineer",
  links: {
    linkedin: "https://www.linkedin.com/in/julianpalomodeonis",
    github: "https://github.com/Zitric",
  },
} as const;

/** The document title: name and role on the home page, "Page · Name" on any other page. */
export function pageTitle(page?: string): string {
  const label = page?.trim();
  return label ? `${label} · ${site.name}` : `${site.name} · ${site.role}`;
}
