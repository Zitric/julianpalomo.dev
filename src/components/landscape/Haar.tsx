// The three bands of sea fog, back to front. The first drifts behind the
// loch, the other two in front of the pines.
const BANDS = {
  1: "M-700 214 C -300 194 500 198 760 212 C 500 230 -300 234 -700 214 Z",
  2: "M200 248 C 500 230 1400 230 1900 244 C 1400 262 500 264 200 248 Z",
  3: "M-700 274 C -200 256 1300 258 1900 272 C 1300 290 -200 292 -700 274 Z",
} as const;

/** One band of haar; it shows only while the sky has haar. */
export function HaarBand({ band }: { band: keyof typeof BANDS }) {
  return <path className={`fog f${band}`} d={BANDS[band]} />;
}
