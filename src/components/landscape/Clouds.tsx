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
        d="M-600 0 H1800 V96 C 1786.7 96 1773.3 97.2 1760 97.2 C 1746.7 97.2 1733.3 93.7 1720 93.7 C 1706.7 93.7 1693.3 99.5 1680 99.5 C 1666.7 99.5 1653.3 91.3 1640 91.3 C 1626.7 91.3 1613.3 101.8 1600 101.8 C 1586.7 101.8 1573.3 89 1560 89 C 1546.7 89 1533.3 103 1520 103 C 1506.7 103 1493.3 89 1480 89 C 1466.7 89 1453.3 103 1440 103 C 1426.7 103 1413.3 89 1400 89 C 1386.7 89 1373.3 103 1360 103 C 1346.7 103 1333.3 89 1320 89 C 1306.7 89 1293.3 103 1280 103 C 1266.7 103 1253.3 89 1240 89 C 1226.7 89 1213.3 90.7 1200 96 C 1160 112 1120 100 1080 110 C 1040 122 1000 104 960 112 C 920 124 870 108 830 116 C 790 126 750 108 700 116 C 650 126 610 110 570 118 C 520 128 480 110 440 116 C 400 124 360 108 320 114 C 270 124 230 106 190 112 C 140 120 100 104 60 110 C 30 116 10 108 0 112 C -13.3 117.3 -26.7 119 -40 119 C -53.3 119 -66.7 105 -80 105 C -93.3 105 -106.7 119 -120 119 C -133.3 119 -146.7 105 -160 105 C -173.3 105 -186.7 119 -200 119 C -213.3 119 -226.7 105 -240 105 C -253.3 105 -266.7 119 -280 119 C -293.3 119 -306.7 105 -320 105 C -333.3 105 -346.7 119 -360 119 C -373.3 119 -386.7 106.2 -400 106.2 C -413.3 106.2 -426.7 116.7 -440 116.7 C -453.3 116.7 -466.7 108.5 -480 108.5 C -493.3 108.5 -506.7 114.3 -520 114.3 C -533.3 114.3 -546.7 110.8 -560 110.8 C -573.3 110.8 -586.7 112 -600 112 Z"
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
        d="M-600 0 H1800 V136 C 1784.6 136 1769.2 137.3 1753.8 137.3 C 1738.5 137.3 1723.1 133.3 1707.7 133.3 C 1692.3 133.3 1676.9 140 1661.5 140 C 1646.2 140 1630.8 130.6 1615.4 130.6 C 1600 130.6 1584.6 142.7 1569.2 142.7 C 1553.8 142.7 1538.5 129 1523.1 129 C 1507.7 129 1492.3 143 1476.9 143 C 1461.5 143 1446.2 129 1430.8 129 C 1415.4 129 1400 143 1384.6 143 C 1369.2 143 1353.8 129 1338.5 129 C 1323.1 129 1307.7 143 1292.3 143 C 1276.9 143 1261.5 129 1246.2 129 C 1230.8 129 1215.4 131.7 1200 136 C 1150 150 1110 134 1060 146 C 1010 158 970 140 920 150 C 870 162 830 142 780 152 C 730 164 690 146 640 154 C 590 164 550 146 500 154 C 450 164 410 144 360 152 C 310 162 270 144 220 152 C 170 162 130 144 80 152 C 50 158 20 150 0 154 C -15.4 157.1 -30.8 161 -46.2 161 C -61.5 161 -76.9 147 -92.3 147 C -107.7 147 -123.1 161 -138.5 161 C -153.8 161 -169.2 147 -184.6 147 C -200 147 -215.4 161 -230.8 161 C -246.2 161 -261.5 147 -276.9 147 C -292.3 147 -307.7 161 -323.1 161 C -338.5 161 -353.8 147.3 -369.2 147.3 C -384.6 147.3 -400 159.4 -415.4 159.4 C -430.8 159.4 -446.2 150 -461.5 150 C -476.9 150 -492.3 156.7 -507.7 156.7 C -523.1 156.7 -538.5 152.7 -553.8 152.7 C -569.2 152.7 -584.6 154 -600 154 Z"
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
