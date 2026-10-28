/*
 * The herd: small, full-body Highland cows grazing in the glen (DESIGN.md
 * section 7, "The herd"). One drawing from docs/design/herd-cow.svg, placed
 * four times; the loops live in src/styles/landscape.css.
 */

type Placement = {
  /** What its head does: grazes (16s, or 19s offset) or looks around (11s). */
  loop: "graze" | "graze2" | "look";
  calf?: boolean;
  x: number;
  y: number;
  scale: number;
  facesLeft?: boolean;
};

/** The cow on the right hill, behind the first haar band: only wide screens reach it. */
const FAR: Placement = { loop: "graze2", x: 1118, y: 222, scale: 0.26 };

/** The grazer, the calf and its mother, in the middle band every screen shows. */
const NEAR: Placement[] = [
  { loop: "graze", x: 420, y: 294, scale: 0.8 },
  { loop: "look", calf: true, x: 598, y: 296, scale: 0.48 },
  { loop: "graze2", x: 655, y: 294, scale: 0.72, facesLeft: true },
];

function HerdCow({ loop, calf, x, y, scale, facesLeft }: Placement) {
  const className = calf ? `hcow calf ${loop}` : `hcow ${loop}`;
  const flip = facesLeft ? -scale : scale;
  return (
    <g className={className} transform={`translate(${x} ${y}) scale(${flip} ${scale})`}>
      <g className="hc-tail">
        <path className="hc-tailline" d="M-21 -20 C -26 -17 -27 -10 -25 -5" />
        <ellipse className="hc-coat2" cx="-25" cy="-4" rx="2.2" ry="3.2" />
      </g>
      <g className="hc-legs">
        <rect x="-19" y="-11" width="4.2" height="11" rx="1.4" />
        <rect x="-12" y="-11" width="4.2" height="11" rx="1.4" />
        <rect x="5" y="-11" width="4.2" height="11" rx="1.4" />
        <rect x="11" y="-11" width="4.2" height="11" rx="1.4" />
      </g>
      <g className="hc-hooves">
        <rect x="-19" y="-1.6" width="4.2" height="1.6" />
        <rect x="-12" y="-1.6" width="4.2" height="1.6" />
        <rect x="5" y="-1.6" width="4.2" height="1.6" />
        <rect x="11" y="-1.6" width="4.2" height="1.6" />
      </g>
      <path
        className="hc-coat"
        d="M-22 -15 C -24 -24 -15 -28 -3 -28 C 8 -28 15 -26 17 -19 L 18 -10 l -3.6 3 l -3.6 -3 l -3.6 3 l -3.6 -3 l -3.6 3 l -3.6 -3 l -3.6 3 l -3.6 -3 l -3.6 3 l -3.6 -3 l -3.6 3 C -23 -10 -22 -12 -22 -15 Z"
      />
      <path
        className="hc-strand"
        d="M-17 -25 q 1.6 3 0.2 6 M-11 -26 q 1.6 3 0.2 6 M-5 -26 q 1.6 3 0.2 6 M1 -26 q 1.6 3 0.2 6 M7 -25 q 1.6 3 0.2 6 M-19 -19 q 1.6 3 0.2 6 M-13 -20 q 1.6 3 0.2 6 M-7 -20 q 1.6 3 0.2 6 M-1 -20 q 1.6 3 0.2 6 M5 -19 q 1.6 3 0.2 6 M11 -19 q 1.6 3 0.2 6"
      />
      <g className="hc-head">
        <path className="hc-horn" d="M17 -26 C 13 -27 10.5 -30 11.5 -33.5" />
        <path
          className="hc-coat"
          d="M14 -23 C 16 -30 25 -31 28 -25 C 31 -19 31 -12 27 -9 C 23 -7 18 -10 16 -15 Z"
        />
        <ellipse className="hc-muzzle" cx="27.5" cy="-11.5" rx="3.6" ry="2.8" />
        <circle className="hc-nostril" cx="29.4" cy="-12" r=".7" />
        <path
          className="hc-coat2"
          d="M13 -24 C 16 -31 26 -32 29 -24 l -1 4 l -2 -2.5 l -1 3.5 l -2 -3 l -1 3 l -2 -2.5 l -1 2.5 l -2 -3 l -1.5 2 Z"
        />
        <path className="hc-horn" d="M24 -28.5 C 28 -29.5 30.5 -31.5 30 -35.5" />
        <path className="hc-ear" d="M15 -23 L 10 -22 L 14 -20 Z" />
      </g>
    </g>
  );
}

export function FarCow() {
  return (
    <g className="herd">
      <HerdCow {...FAR} />
    </g>
  );
}

export function NearHerd() {
  return (
    <g className="herd">
      {NEAR.map((cow) => (
        <HerdCow key={cow.x} {...cow} />
      ))}
    </g>
  );
}
