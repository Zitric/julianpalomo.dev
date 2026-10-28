/*
 * The weather levels to what the scene shows (the weather table in DESIGN.md
 * section 7), as plain numbers, so the components only paint them. The
 * formulas follow the approved mock-up where the table leaves room: rain
 * raises the cloud level itself, darker clouds start at 6, and the cloud and
 * rain fades of the sun or moon multiply.
 */

type Weather = { clouds: number; rain: number; wind: number; snow: boolean; haar: boolean };

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export type Effects = {
  /** The cloud level after rain: rain means at least `rain + 3`. Every cloud effect reads this. */
  clouds: number;
  /** How many of the 13 clouds show, from the back. */
  visibleClouds: number;
  /** Every other cloud takes the darker cloud colour. */
  darkClouds: boolean;
  backDeck: number;
  frontDeck: number;
  /** The two grey-outs over the sky: one for cloud, one for rain. */
  cloudGrey: number;
  rainGrey: number;
  /** The sun's or moon's opacity, the cloud fade times the rain fade. */
  orb: number;
  /** The stars' opacity before the time of day. */
  stars: number;
  ripples: number;
  /** How many times faster the clouds drift. */
  cloudSpeed: number;
  /** The pines' sway, in seconds per swing, and whether they bend harder. */
  swaySeconds: number;
  swayHard: boolean;
  /** Snow settles on the land. */
  snowCover: boolean;
  haar: boolean;
};

export function effects({ clouds, rain, wind, snow, haar }: Weather): Effects {
  const level = rain > 0 ? Math.max(clouds, Math.min(10, rain + 3)) : clouds;
  return {
    clouds: level,
    visibleClouds: Math.round(level * 1.3),
    darkClouds: level >= 6,
    backDeck: level >= 6 ? (level - 5) / 5 : 0,
    frontDeck: level >= 8 ? ((level - 7) / 3) * 0.9 : 0,
    cloudGrey: level * 0.035,
    rainGrey: rain * 0.04,
    orb: (level >= 7 ? clamp(1 - (level - 6) / 3.5) : 1) * clamp(1 - rain / 4),
    stars: clamp(1 - level / 8),
    ripples: rain > 0 ? 0.4 + rain * 0.05 : 0,
    cloudSpeed: 1 + wind * 0.45,
    swaySeconds: Math.max(0.9, 5 - wind * 0.45),
    swayHard: wind >= 4,
    snowCover: snow && rain >= 3,
    haar,
  };
}
