import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Landscape } from "../../src/components/landscape/Landscape";
import { defaultSky } from "../../src/lib/scene/sky-state";

// The landscape is rendered to markup and compared with the reference artwork,
// shape by shape, so a path can't drift from docs/design/highland-scene.svg.
const reference = readFileSync("docs/design/highland-scene.svg", "utf8");
const now = Date.parse("2026-10-28T15:00:00Z");
const rendered = renderToStaticMarkup(
  createElement(Landscape, { sky: defaultSky(now), at: now, choreography: null, paused: false }),
);

const GEOMETRY = ["d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height"];

/** Every drawn shape in order, with its geometry: what the picture is made of. */
function shapes(svg: string): string[] {
  const body = svg.slice(svg.indexOf("</defs>"));
  return [...body.matchAll(/<(path|circle|ellipse|rect)\b([^>]*)>/g)].map(([, tag, attributes]) => {
    const values = GEOMETRY.flatMap((name) => {
      const match = new RegExp(`\\s${name}="([^"]*)"`).exec(attributes ?? "");
      return match
        ? [`${name}=${Number.isNaN(Number(match[1])) ? match[1] : Number(match[1])}`]
        : [];
    });
    return `${tag} ${values.join(" ")}`;
  });
}

describe("the landscape's drawing", () => {
  it("has every shape of the reference, in the same order and place", () => {
    const expected = shapes(reference).filter((shape) => !shape.startsWith("rect width=1200"));
    const actual = shapes(rendered).filter((shape) => !shape.startsWith("rect width=1200"));
    expect(expected.length).toBeGreaterThan(200);
    expect(actual).toEqual(expected);
  });

  it("has the reference's full-size layers: sky, two grey-outs and the golden tint", () => {
    const layers = (svg: string) =>
      [...svg.matchAll(/<rect class="(sky|greyout2?|golden)"/g)].map(([, name]) => name);
    expect(layers(rendered)).toEqual(layers(reference));
  });

  it("is decoration, hidden from screen readers", () => {
    expect(rendered).toMatch(/^<svg[^>]*aria-hidden="true"/);
    expect(rendered).toContain('viewBox="0 0 1200 320"');
    expect(rendered).toContain('preserveAspectRatio="xMidYMax slice"');
  });
});
