/**
 * The illustration's colours. They are part of the artwork, so they live here
 * as data rather than as UI tokens: the one exception to "colours live only in
 * tokens.css" (DESIGN.md section 2). The values are copied from
 * docs/design/landscape-palettes.json, which the app never imports;
 * tests/unit/assistant-cow.test.ts keeps them equal.
 */

/** The assistant's head. The keys are the reference SVG's CSS variable names. */
export const assistantCow = {
  horn: "#D9B98A",
  "horn-hi": "#F2DEBC",
  ear: "#6E3410",
  face: "#8E461A",
  fringe: "#B5662E",
  "fringe-hi": "#D0904F",
  strand: "#6E3410",
  muzzle: "#C98A55",
  chin: "#B9784A",
  pad: "#EBC6A0",
  nostril: "#6B3A1E",
  mouth: "#5A1A16",
  tongue: "#E48A8A",
  "tongue-dark": "#C96B70",
} as const;
