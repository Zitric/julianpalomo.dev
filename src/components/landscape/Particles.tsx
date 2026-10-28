import type { CSSProperties } from "react";
import type { Effects } from "../../lib/scene/effects";
import { type Particle, particlesFor } from "../../lib/scene/particles";
import type { SkyState } from "../../lib/scene/sky-state";

type Props = {
  sky: SkyState;
  effects: Effects;
  elevation: number;
  landLight: number;
  paused: boolean;
};

/**
 * The particles over the hero, in their own layer: leaves, petals, rain and
 * snow fall across it and fade out from 34% to 70% of its height, so they
 * never fall over the name or the chat; midges hover over the loch and frost
 * glints on the meadow, where the scene has them. Decoration only. The
 * motion lives in src/styles/landscape.css; with reduced motion there are
 * none.
 */
export function Particles({ sky, effects, elevation, landLight, paused }: Props) {
  const all = particlesFor({ sky, effects, elevation, landLight });
  const falling = all.filter(({ kind }) => kind !== "midge" && kind !== "glint");
  const resting = all.filter(({ kind }) => kind === "midge" || kind === "glint");

  return (
    <div
      className="particles"
      aria-hidden="true"
      data-paused={paused || undefined}
      data-blowing={sky.wind >= 5 || undefined}
    >
      <div className="particles-falling">
        {falling.map((particle) => (
          <span
            key={particle.key}
            className={`particle ${particle.kind}`}
            style={style(particle)}
          />
        ))}
      </div>
      {resting.map((particle) => (
        <span key={particle.key} className={`particle ${particle.kind}`} style={style(particle)} />
      ))}
    </div>
  );
}

function style({ x, y, size, delay, duration, drift, colour }: Particle): CSSProperties {
  return {
    "--x": x,
    "--y": y,
    "--size": `${size}px`,
    "--delay": `${delay}s`,
    "--duration": `${duration}s`,
    "--drift": `${drift}cqh`,
    "--colour": colour,
  } as CSSProperties;
}
