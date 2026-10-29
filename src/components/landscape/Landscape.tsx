import { type CSSProperties, useId } from "react";
import { effects } from "../../lib/scene/effects";
import {
  auroraHour,
  glasgowElevation,
  herdBrightness,
  orbs,
  skyMix,
  starsVisibility,
} from "../../lib/scene/moment";
import { herdCow, land, mixHex, sceneFixed, skyMoments } from "../../lib/scene/palette";
import type { SkyState } from "../../lib/scene/sky-state";
import { Clouds } from "./Clouds";
import { Cottage } from "./Cottage";
import { HaarBand } from "./Haar";
import { FarCow, NearHerd } from "./Herd";
import { Loch } from "./Loch";
import { Meadow } from "./Meadow";
import { Mountains } from "./Mountains";
import { Pines } from "./Pines";
import { Sky } from "./Sky";

type Props = {
  sky: SkyState;
  /** The instant the scene shows: the sky's own, or the theme's representative moment. */
  at: number;
  /** The landscape's half of a theme toggle, while it runs (DESIGN.md section 6). */
  choreography: "sunset" | "sunrise" | null;
  /** Every animation holds while the tab is hidden. */
  paused: boolean;
};

const SKY_KEYS = [
  "sky",
  "low",
  "cloud",
  "cloud2",
  "sun",
  "loch",
  "lochhi",
  "haze",
  "fog",
  "snow",
  "tree",
  "walls",
  "roof",
  "window",
  "smoke",
  "stone",
  "rock",
  "grey",
] as const;
const LAND_KEYS = ["far", "mid", "near", "patch"] as const;

// SVG references ids inside url(#…), so keep useId's output to safe characters.
const svgId = (prefix: string, id: string) => `${prefix}-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

/**
 * The Highland glen in the hero (DESIGN.md section 7): one SkyState in, one
 * SVG out. Every colour and level reaches the drawing as a custom property on
 * the root, so a new moment or weather is one style change that
 * src/styles/landscape.css transitions over 1.1s.
 */
export function Landscape({ sky, at, choreography, paused }: Props) {
  const id = useId();
  const skyGradient = svgId("landscape-sky", id);
  const auroraGradient = svgId("landscape-aurora", id);

  const elevation = glasgowElevation(at);
  const { from, to, mix, landLight } = skyMix(elevation);
  const fx = effects(sky);
  const { sun, moon } = orbs(at);
  const aurora = sky.season === "winter" && fx.clouds <= 1 && auroraHour(at);

  const colours: Record<string, string | number> = {};
  for (const key of SKY_KEYS)
    colours[`--${key}`] = mixHex(skyMoments[from][key], skyMoments[to][key], mix);
  for (const key of LAND_KEYS)
    colours[`--${key}`] = mixHex(land[sky.season].night[key], land[sky.season].day[key], landLight);
  for (const [key, value] of Object.entries({ ...sceneFixed, ...herdCow }))
    colours[`--${key}`] = value;

  const tint = skyMoments[from].tint + (skyMoments[to].tint - skyMoments[from].tint) * mix;
  const style = {
    ...colours,
    "--golden-tint": tint,
    "--orb-opacity": fx.orb,
    "--stars-opacity": starsVisibility(elevation) * fx.stars,
    "--back-deck": fx.backDeck,
    "--front-deck": fx.frontDeck,
    "--cloud-grey": fx.cloudGrey,
    "--rain-grey": fx.rainGrey,
    "--ripples": fx.ripples,
    "--herd-brightness": herdBrightness(elevation),
    "--sway-seconds": `${fx.swaySeconds}s`,
  } as CSSProperties;

  return (
    <svg
      className="landscape absolute inset-0 size-full"
      viewBox="-600 0 2400 320"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      data-season={sky.season}
      data-snowy={fx.snowCover || undefined}
      data-haar={fx.haar || undefined}
      data-aurora={aurora || undefined}
      data-sway-hard={fx.swayHard || undefined}
      data-choreography={choreography ?? undefined}
      data-paused={paused || undefined}
      style={style}
    >
      <defs>
        <linearGradient id={skyGradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sky-top" />
          <stop offset="1" className="sky-low" />
        </linearGradient>
        <linearGradient id={auroraGradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="aurora-stop" stopOpacity="0" />
          <stop offset=".6" className="aurora-stop" stopOpacity=".55" />
          <stop offset="1" className="aurora-stop aurora-end" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* The enter- groups are for the page's entrance (src/styles/entrance.css). */}
      <g className="enter-sky">
        <Sky skyGradient={skyGradient} auroraGradient={auroraGradient} sun={sun} moon={moon} />
      </g>
      <g className="enter-clouds">
        <Clouds visible={fx.visibleClouds} dark={fx.darkClouds} speed={fx.cloudSpeed} />
      </g>
      <Mountains />
      <g className="enter-cottage">
        <Cottage />
      </g>
      <g className="enter-herd enter-herd-1">
        <FarCow />
      </g>
      <g className="enter-haar">
        <HaarBand band={1} />
      </g>
      <g className="enter-loch">
        <Loch />
      </g>
      <g className="enter-near">
        <Meadow />
      </g>
      <g className="enter-herd enter-herd-2">
        <NearHerd />
      </g>
      <g className="enter-pines">
        <Pines />
      </g>
      <g className="enter-haar">
        <HaarBand band={2} />
        <HaarBand band={3} />
      </g>
      <rect className="golden" x="-600" width="2400" height="320" />
      <rect className="glow" x="-600" width="2400" height="320" />
    </svg>
  );
}
