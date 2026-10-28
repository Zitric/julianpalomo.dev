import type { OrbPosition } from "../../lib/scene/moment";

// The reference's stars: x, y, radius, and their twinkle's delay and length in seconds.
const STARS: [number, number, number, number, number][] = [
  [219, 16, 1.1, -0.8, 2.7],
  [888, 22, 1.3, -3.3, 3.0],
  [677, 63, 1.2, -2.2, 2.8],
  [546, 59, 1.9, -0.1, 4.9],
  [327, 144, 1.5, -0.4, 3.1],
  [988, 87, 1.9, -1.1, 3.1],
  [903, 92, 1.6, -3.9, 4.5],
  [605, 91, 0.9, -1.7, 5.3],
  [628, 92, 1.8, -0.0, 4.5],
  [626, 92, 0.9, -2.0, 5.4],
  [24, 65, 1.1, -2.3, 5.1],
  [711, 140, 1.7, -2.9, 4.1],
  [733, 126, 1.6, -2.5, 5.3],
  [482, 40, 1.0, -0.1, 4.1],
  [1019, 117, 0.9, -1.7, 3.5],
  [409, 105, 1.0, -1.4, 4.6],
  [507, 146, 1.4, -1.0, 4.1],
  [285, 76, 1.3, -1.9, 3.9],
  [1185, 142, 1.0, -1.3, 2.6],
  [852, 82, 0.8, -3.6, 5.2],
  [1039, 85, 1.0, -3.3, 5.3],
  [1022, 82, 1.5, -1.7, 4.4],
  [52, 26, 1.7, -3.8, 4.8],
  [754, 24, 1.0, -1.7, 4.4],
  [1120, 70, 1.0, -3.2, 4.8],
  [274, 135, 0.9, -1.8, 5.0],
  [919, 93, 2.0, -3.9, 3.5],
  [186, 33, 0.9, -1.6, 3.0],
  [1094, 88, 1.8, -2.2, 5.3],
  [214, 120, 1.3, -2.2, 5.5],
  [412, 14, 1.7, -1.0, 4.5],
  [676, 100, 1.8, -1.6, 5.3],
  [441, 17, 1.4, -3.9, 4.3],
  [485, 67, 1.0, -0.0, 4.5],
  [684, 39, 1.3, -3.4, 4.4],
  [137, 114, 1.6, -2.6, 3.2],
  [768, 113, 1.9, -2.9, 4.8],
  [1153, 126, 1.0, -1.1, 5.1],
  [299, 77, 1.6, -2.3, 5.3],
  [315, 73, 1.2, -0.9, 3.3],
  [939, 72, 1.2, -3.2, 2.7],
  [1025, 71, 1.6, -1.8, 5.1],
  [768, 26, 0.9, -2.3, 3.9],
  [96, 82, 0.9, -1.2, 2.8],
  [598, 80, 1.1, -0.6, 3.2],
  [970, 145, 1.3, -3.5, 5.2],
];

type Props = {
  skyGradient: string;
  auroraGradient: string;
  sun: OrbPosition;
  moon: OrbPosition;
};

/**
 * The sky gradient, the stars, the aurora, the moon and the sun, and the two
 * weather grey-outs. Each orb has two transforms: the outer one is its place
 * on the arc, the inner one drops it behind the hills while it's down.
 */
export function Sky({ skyGradient, auroraGradient, sun, moon }: Props) {
  return (
    <>
      <rect className="sky" width="1200" height="320" fill={`url(#${skyGradient})`} />
      <g className="stars-c">
        <g className="stars">
          {STARS.map(([cx, cy, r, delay, duration]) => (
            <circle
              key={`${cx}-${cy}`}
              className="star"
              cx={cx}
              cy={cy}
              r={r}
              style={{ animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
            />
          ))}
        </g>
      </g>
      <g className="aurora">
        <path
          d="M0 120 C 200 60 400 140 600 80 C 800 30 1000 110 1200 60 L1200 120 C 1000 170 800 90 600 140 C 400 200 200 120 0 180 Z"
          fill={`url(#${auroraGradient})`}
        />
      </g>
      <g className="orb-c">
        <g className="orb-r">
          <Orb className="moon" position={moon}>
            <circle className="m-halo" r="40" />
            <circle className="m-disc" r="20" />
            <circle className="m-bite" cx="10" cy="-7" r="17" />
          </Orb>
          <Orb className="sun" position={sun}>
            <circle className="s-halo" r="48" />
            <circle className="s-disc" r="25" />
          </Orb>
        </g>
      </g>
      <rect className="greyout" width="1200" height="320" />
      <rect className="greyout2" width="1200" height="320" />
    </>
  );
}

function Orb({
  className,
  position,
  children,
}: {
  className: string;
  position: OrbPosition;
  children: React.ReactNode;
}) {
  return (
    <g
      className={`orb ${className}`}
      data-up={position.up}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      <g className="orb-lift">{children}</g>
    </g>
  );
}
