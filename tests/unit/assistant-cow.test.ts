import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { assistantCow } from "../../src/lib/scene/palette";

// The component is checked as text: unit tests run in node, without a DOM.
const reference = readFileSync("docs/design/assistant-cow.svg", "utf8");
const component = readFileSync("src/components/cow/AssistantCow.tsx", "utf8");
const palettes = z
  .object({ assistantCow: z.record(z.string(), z.string()) })
  .parse(JSON.parse(readFileSync("docs/design/landscape-palettes.json", "utf8")));

function matches(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match.slice(1).find(Boolean) ?? "");
}

describe("the assistant cow's drawing", () => {
  it("has the reference's paths, in the same order", () => {
    const paths = matches(reference, /\sd="([^"]+)"/g);
    expect(paths.length).toBeGreaterThan(40);
    expect(matches(component, /\sd="([^"]+)"/g)).toEqual(paths);
  });

  it("paints each part with the reference's colour, in the same order", () => {
    const referenceColours = matches(reference, /(?:fill|stroke)="var\(--([a-z-]+)\)"/g);
    const componentColours = matches(
      component,
      /(?:fill|stroke)=\{cow(?:\.([a-z]+)|\["([a-z-]+)"\])\}/g,
    );
    expect(componentColours).toEqual(referenceColours);
  });

  it("keeps the reference's part groups, in the same order", () => {
    const groups = /class(?:Name)?="(tilt|jaw|talk|licks|lick-r|lick-l|lick-mouth)"/g;
    expect(matches(component, groups)).toEqual(matches(reference, groups));
  });

  it("has the palette's colours", () => {
    expect(assistantCow).toEqual(palettes.assistantCow);
  });
});
