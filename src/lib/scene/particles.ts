/*
 * The particles over the hero (DESIGN.md section 7, "Particles"): which ones
 * fall or hover for a given sky, and where and how fast each one goes. Every
 * value comes from a seeded pseudo-random sequence per kind, so the server
 * and the client render the same particles and a reload looks the same.
 */

import type { Effects } from "./effects";
import { particles as colours } from "./palette";
import type { SkyState } from "./sky-state";

const KINDS = ["leaf", "petal", "midge", "glint", "rain", "snow"] as const;
export type ParticleKind = (typeof KINDS)[number];

export type Particle = {
  kind: ParticleKind;
  key: string;
  /**
   * Falling kinds: % of the hero's width. Midges and glints: the scene's own
   * x (viewBox units), so they stay over the loch or on the meadow.
   */
  x: number;
  /** Midges and glints only: the scene's y (viewBox units). */
  y: number;
  /** px. */
  size: number;
  /** Seconds; negative, so the particle is already part-way through when the page loads. */
  delay: number;
  /** Seconds for one fall, buzz or twinkle, after the wind. */
  duration: number;
  /** How far it drifts sideways over one fall, in % of the hero's height (leaves and rain in wind). */
  drift: number;
  colour: string;
};

// Seconds per fall, buzz or twinkle in calm air. DESIGN.md section 11 records them.
const TIMING: Record<ParticleKind, [min: number, max: number]> = {
  leaf: [7, 11],
  petal: [8, 12],
  rain: [0.6, 0.9],
  snow: [6, 10],
  midge: [1.2, 2],
  glint: [2, 4],
};

const SIZE: Record<ParticleKind, [min: number, max: number]> = {
  leaf: [7, 11],
  petal: [5, 8],
  rain: [10, 16],
  snow: [3, 6],
  midge: [2, 3],
  glint: [2.5, 4],
};

// Midges hover in a small cloud over the loch; glints lie on the near meadow,
// inside the band every screen shows (x 329–871 on a phone).
const MIDGE_CLOUD = { x: [560, 640], y: [222, 238] } as const;
const GLINT_MEADOW = { x: [340, 860], y: [268, 300] } as const;

/** mulberry32: a small, fast seeded generator, plenty for scattering particles. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One sequence per kind, so more rain never reshuffles the leaves.
const SEEDS: Record<ParticleKind, number> = {
  leaf: 11,
  petal: 23,
  rain: 37,
  snow: 41,
  midge: 53,
  glint: 67,
};

type Input = {
  sky: SkyState;
  effects: Effects;
  /** The sun's elevation over Glasgow at the scene's moment. */
  elevation: number;
  /** The scene's land light, 0 at night to 1 by day. */
  landLight: number;
};

/** How many of each kind the sky has (the table in section 7). */
export function particleCounts({ sky, effects, elevation }: Input): Record<ParticleKind, number> {
  const { season, rain, wind, snow } = sky;
  const fewerInRain = 1 - rain / 12;
  return {
    leaf: season === "autumn" ? Math.round(12 * fewerInRain) : 0,
    petal: season === "spring" ? Math.round(14 * fewerInRain) : 0,
    midge: season === "summer" && wind < 4 && rain < 3 ? 16 : 0,
    glint: season === "winter" && elevation > 0 && rain === 0 && effects.clouds < 4 ? 10 : 0,
    rain: rain > 0 && !snow ? rain * 10 : 0,
    snow: rain > 0 && snow ? rain * 8 : 0,
  };
}

function colourOf(kind: ParticleKind, index: number, dark: boolean): string {
  switch (kind) {
    case "leaf": {
      const set = dark ? colours.leafDark : colours.leaf;
      return set[index % set.length] ?? colours.leaf[0];
    }
    case "petal":
      return colours.petal[index % colours.petal.length] ?? colours.petal[0];
    case "rain":
      return dark ? colours.raindropDark : colours.raindrop;
    case "snow":
    case "glint":
      return dark ? colours.snowflakeDark : colours.snowflake;
    case "midge":
      return dark ? colours.midgeDark : colours.midge;
    default: {
      const unhandled: never = kind;
      throw new Error(String(unhandled));
    }
  }
}

const between = (random: () => number, [min, max]: readonly [number, number]) =>
  min + (max - min) * random();

/** Every particle for the sky, in a stable order. */
export function particlesFor(input: Input): Particle[] {
  const counts = particleCounts(input);
  const { wind } = input.sky;
  // Everything falls faster in wind; from 5, rain slants and leaves blow sideways.
  const speed = 1 + wind * 0.18;
  const blowing = wind >= 5;
  const dark = input.landLight < 0.5;

  const all: Particle[] = [];
  for (const kind of KINDS) {
    const random = seeded(SEEDS[kind]);
    const anchored = kind === "midge" || kind === "glint";
    const falls = !anchored;
    for (let index = 0; index < counts[kind]; index++) {
      const area = kind === "midge" ? MIDGE_CLOUD : GLINT_MEADOW;
      const duration = between(random, TIMING[kind]) / (falls ? speed : 1);
      let drift = 0;
      if (blowing && kind === "rain") drift = 12;
      if (blowing && kind === "leaf") drift = 45;
      all.push({
        kind,
        key: `${kind}-${index}`,
        x: anchored ? between(random, area.x) : random() * 100,
        y: anchored ? between(random, area.y) : 0,
        size: between(random, SIZE[kind]),
        delay: -random() * duration,
        duration,
        drift,
        colour: colourOf(kind, index, dark),
      });
    }
  }
  return all;
}
