import { clouds } from "../../lib/scene/palette";

// The drift's start and end, as in landscape-drift in src/styles/landscape.css. Keep the two in step.
const DRIFT_FROM = -300;
const DRIFT_TO = 1400;

const CLOUD =
  "M0 30 C 0 18 12 12 22 16 C 26 4 46 0 56 10 C 64 4 80 8 80 20 C 92 20 98 30 92 36 L4 36 C 0 36 0 33 0 30 Z";

type Props = {
  /** How many of the 13 clouds show, from the first. */
  visible: number;
  /** Every other cloud takes the darker cloud colour. */
  dark: boolean;
  /** How many times faster than calm the clouds drift. */
  speed: number;
};

/** The back cloud deck, the 13 drifting clouds, and the front deck. */
export function Clouds({ visible, dark, speed }: Props) {
  return (
    <>
      <path
        className="deck deck1"
        d="M0 0 H1200 V96 C 1160 112 1120 100 1080 110 C 1040 122 1000 104 960 112 C 920 124 870 108 830 116 C 790 126 750 108 700 116 C 650 126 610 110 570 118 C 520 128 480 110 440 116 C 400 124 360 108 320 114 C 270 124 230 106 190 112 C 140 120 100 104 60 110 C 30 116 10 108 0 112 Z"
        transform="translate(0 -22)"
      />
      <g className="clouds">
        {clouds.map((cloud, index) => {
          const shown = index < visible ? "" : " hidden";
          const shade = dark && index % 2 === 1 ? " dark" : "";
          // Duration and delay scale together, so a cloud keeps its place in its
          // crossing. The transform is where that delay puts it: the drift
          // animation overrides it, and with reduced motion, which has no drift,
          // the clouds still sit across the sky instead of piling up at x 0.
          const progress = (-cloud.delaySeconds % cloud.driftSeconds) / cloud.driftSeconds;
          const timing = {
            animationDuration: `${cloud.driftSeconds / speed}s`,
            animationDelay: `${cloud.delaySeconds / speed}s`,
            transform: `translateX(${DRIFT_FROM + (DRIFT_TO - DRIFT_FROM) * progress}px)`,
          };
          return (
            <g key={cloud.id} className={`cloud ${cloud.id}${shown}${shade}`} style={timing}>
              <path
                className="cloud-body"
                d={CLOUD}
                transform={`translate(0 ${cloud.y}) scale(${cloud.scale})`}
              />
            </g>
          );
        })}
      </g>
      <path
        className="deck deck2"
        d="M0 0 H1200 V136 C 1150 150 1110 134 1060 146 C 1010 158 970 140 920 150 C 870 162 830 142 780 152 C 730 164 690 146 640 154 C 590 164 550 146 500 154 C 450 164 410 144 360 152 C 310 162 270 144 220 152 C 170 162 130 144 80 152 C 50 158 20 150 0 154 Z"
        transform="translate(0 -92)"
      />
    </>
  );
}
