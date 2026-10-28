// The three bands of sea fog, back to front. The first drifts behind the
// loch, the other two in front of the pines.
const BANDS = {
  1: "M-100 214 C 100 196 500 198 760 212 C 500 230 100 232 -100 214 Z",
  2: "M200 248 C 500 230 1000 232 1300 244 C 1000 262 500 264 200 248 Z",
  3: "M-200 274 C 200 258 700 260 1000 272 C 700 288 200 290 -200 274 Z",
} as const;

/** One band of haar; it shows only while the sky has haar. */
export function HaarBand({ band }: { band: keyof typeof BANDS }) {
  return <path className={`fog f${band}`} d={BANDS[band]} />;
}
