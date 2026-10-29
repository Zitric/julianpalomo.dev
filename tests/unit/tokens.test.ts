import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the tokens straight from the stylesheet, so a changed value is measured
// as it ships.
const css = readFileSync(new URL("../../src/styles/tokens.css", import.meta.url), "utf8");
const app = readFileSync(new URL("../../src/styles/app.css", import.meta.url), "utf8");

type Tokens = Record<string, string>;

/** The `--name: value;` declarations in the first block that follows `selector`. */
function block(selector: string): Tokens {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`No block for ${selector}`);
  const open = css.indexOf("{", start + selector.length);
  const close = css.indexOf("}", open);
  const tokens: Tokens = {};
  for (const [, name, value] of css.slice(open, close).matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    if (name && value) tokens[name] = value.trim();
  }
  return tokens;
}

const light = block(":root {");
const dark = block(':root[data-theme="dark"]');
const exposed = block("@theme inline");

/** Relative luminance of a `#rrggbb` colour, as WCAG 2 defines it. */
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const [r, g, b] = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

const TEXT = 4.5;
const UI = 3;

// [foreground token, background token, minimum ratio]. A new pair on screen
// gets a line here. `glass` and `live` sit on the landscape, which doesn't
// exist yet, so they're measured once it does.
const pairs: [string, string, number][] = [
  ["foreground", "background", TEXT],
  ["foreground", "tint", TEXT],
  ["foreground", "field", TEXT],
  ["muted", "background", TEXT],
  ["muted", "tint", TEXT],
  ["muted", "field", TEXT],
  ["accent", "background", TEXT],
  ["accent", "tint", TEXT],
  ["accent", "field", TEXT],
  ["on-accent", "accent", TEXT],
  ["on-user", "user", TEXT],
  ["danger", "background", TEXT],
  ["danger", "field", TEXT],
  ["field-border", "background", UI],
  ["field-border", "field", UI],
];

describe("tokens.css", () => {
  it("defines every token in light and dark and exposes it to Tailwind", () => {
    const names = Object.keys(light).filter((name) => name !== "color-scheme");
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
    expect(Object.keys(exposed).sort()).toEqual(names.map((name) => `color-${name}`).sort());
  });

  // An unregistered token snaps instead of transitioning on a theme change.
  it("registers every token as a colour", () => {
    const names = Object.keys(light).filter((name) => name !== "color-scheme");
    const registered = [...css.matchAll(/@property --([\w-]+)\s*\{\s*syntax:\s*"<color>"/g)].map(
      ([, name]) => name,
    );
    expect(registered.sort()).toEqual(names.sort());
  });

  it("transitions every token on a theme change", () => {
    const names = Object.keys(light).filter((name) => name !== "color-scheme");
    const transition = /:root\[data-theme-change\]\s*\{\s*transition-property:([^;]+);/.exec(app);
    const transitioned = (transition?.[1] ?? "").split(",").map((name) => name.trim().slice(2));
    expect(transitioned.sort()).toEqual(names.sort());
  });

  // The panel's range thumbs are two-tone, a `field` fill in a `foreground`
  // ring, so one of the two always stands out from a strong track colour
  // (WCAG 1.4.11), and the ring from the panel.
  for (const [theme, tokens] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    it(`gives the range thumbs 3:1 against every track and the panel in the ${theme} theme`, () => {
      const fill = tokens.field ?? "";
      const ring = tokens.foreground ?? "";
      const tracks = Object.keys(tokens).filter((name) => name.startsWith("track-"));
      expect(tracks.length).toBe(10);
      for (const track of tracks) {
        const colour = tokens[track] ?? "";
        expect(
          Math.max(contrast(fill, colour), contrast(ring, colour)),
          track,
        ).toBeGreaterThanOrEqual(UI);
      }
      expect(contrast(ring, tokens.background ?? "")).toBeGreaterThanOrEqual(UI);
    });
  }

  for (const [theme, tokens] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    describe(`in the ${theme} theme`, () => {
      it.each(pairs)("puts %s on %s at %s:1 or more", (fg, bg, minimum) => {
        const front = tokens[fg];
        const back = tokens[bg];
        if (!front || !back) throw new Error(`Missing ${fg} or ${bg}`);
        expect(contrast(front, back)).toBeGreaterThanOrEqual(minimum);
      });
    });
  }
});
