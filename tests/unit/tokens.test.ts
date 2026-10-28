import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the tokens straight from the stylesheet, so a changed value is measured
// as it ships.
const css = readFileSync(new URL("../../src/styles/tokens.css", import.meta.url), "utf8");

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
const darkFromOs = block(':root:not([data-theme="light"])');
const darkFromToggle = block(':root[data-theme="dark"]');
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
  it("keeps the two dark blocks in step", () => {
    expect(darkFromToggle).toEqual(darkFromOs);
  });

  it("defines every token in light and dark and exposes it to Tailwind", () => {
    const names = Object.keys(light).filter((name) => name !== "color-scheme");
    expect(Object.keys(darkFromOs).sort()).toEqual(Object.keys(light).sort());
    expect(Object.keys(exposed).sort()).toEqual(names.map((name) => `color-${name}`).sort());
  });

  for (const [theme, tokens] of [
    ["light", light],
    ["dark", darkFromOs],
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
