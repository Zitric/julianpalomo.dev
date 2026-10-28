import { Fragment } from "react";
import { clouds } from "../../lib/scene/palette";

// The drift's start and end, as in landscape-drift in src/styles/landscape.css.
// Keep the two in step. It crosses the whole wide drawing, x −600 to 1800,
// with room for the largest cloud on either side.
const DRIFT_FROM = -900;
const DRIFT_TO = 2000;
// The palette's drift times are for the scene's 1700-unit crossing; the
// longer crossing takes longer, so the clouds keep their speed on screen.
const LOOP = (DRIFT_TO - DRIFT_FROM) / 1700;

// Each cloud's twin, half a crossing behind it, so the wider sky keeps about
// the same density. A little higher or lower and larger or smaller, so a
// cloud and its twin on screen together don't read as a copy.
const TWINS: { y: number; scale: number }[] = [
  { y: 60, scale: 1.35 },
  { y: 38, scale: 1.1 },
  { y: 88, scale: 1.71 },
  { y: 22, scale: 1.43 },
  { y: 103, scale: 2.07 },
  { y: 38, scale: 2.2 },
  { y: 30, scale: 2.34 },
  { y: 82, scale: 3.19 },
  { y: 82, scale: 2.97 },
  { y: 43, scale: 3.3 },
  { y: 95, scale: 2.25 },
  { y: 37, scale: 3.15 },
  { y: 104, scale: 2.7 },
];

const CLOUD =
  "M0 30 C 0 18 12 12 22 16 C 26 4 46 0 56 10 C 64 4 80 8 80 20 C 92 20 98 30 92 36 L4 36 C 0 36 0 33 0 30 Z";

type Props = {
  /** How many of the 13 clouds show, from the first, each with its twin. */
  visible: number;
  /** Every other cloud takes the darker cloud colour. */
  dark: boolean;
  /** How many times faster than calm the clouds drift. */
  speed: number;
};

/** The back cloud deck, the 13 drifting clouds and their twins, and the front deck. */
export function Clouds({ visible, dark, speed }: Props) {
  return (
    <>
      <path
        className="deck deck1"
        d="M-600 0 H1800 V96 C 1787.7 96 1775.5 97 1763.2 97 C 1752.1 97 1740.9 94.8 1729.8 94.8 C 1714.7 94.8 1699.5 97.7 1684.4 97.7 C 1672.2 97.7 1659.9 91.6 1647.7 91.6 C 1632.4 91.6 1617.1 103.2 1601.8 103.2 C 1587.6 103.2 1573.4 91.1 1559.2 91.1 C 1544.8 91.1 1530.5 101 1516.1 101 C 1507.4 101 1498.7 88.8 1490 88.8 C 1471.3 88.8 1452.6 100.7 1433.9 100.7 C 1424.6 100.7 1415.4 90.5 1406.1 90.5 C 1389.4 90.5 1372.6 99.4 1355.9 99.4 C 1342.4 99.4 1328.9 91.4 1315.4 91.4 C 1306.5 91.4 1297.5 102.7 1288.5 102.7 C 1275 102.7 1261.5 88 1248 88 C 1232 88 1216 89.6 1200 96 C 1160 112 1120 100 1080 110 C 1040 122 1000 104 960 112 C 920 124 870 108 830 116 C 790 126 750 108 700 116 C 650 126 610 110 570 118 C 520 128 480 110 440 116 C 400 124 360 108 320 114 C 270 124 230 106 190 112 C 140 120 100 104 60 110 C 30 116 10 108 0 112 C -14.2 117.7 -28.4 118.6 -42.6 118.6 C -53.6 118.6 -64.7 108.5 -75.8 108.5 C -88.8 108.5 -101.9 116.1 -114.9 116.1 C -133.1 116.1 -151.3 109 -169.5 109 C -181.7 109 -193.9 120.1 -206.1 120.1 C -218.8 120.1 -231.4 105.5 -244.1 105.5 C -258.4 105.5 -272.8 118.6 -287.2 118.6 C -300.8 118.6 -314.4 103.6 -328.1 103.6 C -339.7 103.6 -351.3 120.6 -362.9 120.6 C -377.1 120.6 -391.3 108.7 -405.6 108.7 C -418.4 108.7 -431.3 114.3 -444.1 114.3 C -455.9 114.3 -467.7 107.7 -479.5 107.7 C -493.4 107.7 -507.3 113.2 -521.1 113.2 C -535.4 113.2 -549.7 111.1 -564 111.1 C -576 111.1 -588 112 -600 112 Z"
        transform="translate(0 -22)"
      />
      <g className="clouds">
        {clouds.map((cloud, index) => {
          const shown = index < visible ? "" : " hidden";
          const shade = dark && index % 2 === 1 ? " dark" : "";
          const twin = TWINS[index] ?? cloud;
          const duration = cloud.driftSeconds * LOOP;
          const delay = cloud.delaySeconds * LOOP;
          return (
            <Fragment key={cloud.id}>
              <Cloud
                className={`cloud ${cloud.id}${shown}${shade}`}
                y={cloud.y}
                scale={cloud.scale}
                duration={duration}
                delay={delay}
                speed={speed}
              />
              <Cloud
                className={`cloud ${cloud.id}b${shown}${shade}`}
                y={twin.y}
                scale={twin.scale}
                duration={duration}
                delay={delay - duration / 2}
                speed={speed}
              />
            </Fragment>
          );
        })}
      </g>
      <path
        className="deck deck2"
        d="M-600 0 H1800 V136 C 1786.8 136 1773.6 136.6 1760.4 136.6 C 1740.7 136.6 1721.1 134 1701.5 134 C 1685.2 134 1668.8 137.9 1652.5 137.9 C 1640.6 137.9 1628.6 130.6 1616.6 130.6 C 1601.8 130.6 1587 143.2 1572.2 143.2 C 1556.9 143.2 1541.6 131.7 1526.3 131.7 C 1512.2 131.7 1498.1 144.4 1484 144.4 C 1462.7 144.4 1441.3 127.6 1420 127.6 C 1404.7 127.6 1389.3 139.1 1374 139.1 C 1363.5 139.1 1353.1 132.9 1342.6 132.9 C 1324.2 132.9 1305.8 144.4 1287.4 144.4 C 1276 144.4 1264.6 131.4 1253.2 131.4 C 1235.5 131.4 1217.7 131 1200 136 C 1150 150 1110 134 1060 146 C 1010 158 970 140 920 150 C 870 162 830 142 780 152 C 730 164 690 146 640 154 C 590 164 550 146 500 154 C 450 164 410 144 360 152 C 310 162 270 144 220 152 C 170 162 130 144 80 152 C 50 158 20 150 0 154 C -12.8 156.6 -25.6 157.1 -38.4 157.1 C -58.7 157.1 -78.9 145.8 -99.1 145.8 C -108.9 145.8 -118.6 156.5 -128.4 156.5 C -144.9 156.5 -161.3 146.3 -177.8 146.3 C -197.3 146.3 -216.7 159.3 -236.2 159.3 C -245.9 159.3 -255.7 151.1 -265.4 151.1 C -287.6 151.1 -309.8 161.1 -332 161.1 C -347.7 161.1 -363.3 148.5 -378.9 148.5 C -392 148.5 -405.2 156.2 -418.3 156.2 C -431.2 156.2 -444.1 151.9 -457 151.9 C -477.2 151.9 -497.4 155.1 -517.6 155.1 C -527.9 155.1 -538.2 152.4 -548.5 152.4 C -565.7 152.4 -582.8 154 -600 154 Z"
        transform="translate(0 -92)"
      />
    </>
  );
}

type CloudProps = {
  className: string;
  y: number;
  scale: number;
  /** Seconds for one crossing, and where in it the cloud starts, at calm. */
  duration: number;
  delay: number;
  speed: number;
};

function Cloud({ className, y, scale, duration, delay, speed }: CloudProps) {
  // Duration and delay scale together, so a cloud keeps its place in its
  // crossing. The transform is where that delay puts it: the drift animation
  // overrides it, and with reduced motion, which has no drift, the clouds
  // still sit across the sky instead of piling up at one edge.
  const progress = (((-delay % duration) + duration) % duration) / duration;
  const timing = {
    animationDuration: `${duration / speed}s`,
    animationDelay: `${delay / speed}s`,
    transform: `translateX(${DRIFT_FROM + (DRIFT_TO - DRIFT_FROM) * progress}px)`,
  };
  return (
    <g className={className} style={timing}>
      <path className="cloud-body" d={CLOUD} transform={`translate(0 ${y}) scale(${scale})`} />
    </g>
  );
}
