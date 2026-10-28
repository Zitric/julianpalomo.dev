/** The loch, its shimmer and the sun's reflection, the islet with its ruined tower, and rain ripples. */
export function Loch() {
  return (
    <>
      <path
        className="loch"
        d="M250 254 C 380 238 600 234 820 238 C 900 240 960 244 1000 248 C 900 256 700 262 500 264 C 400 264 310 260 250 254 Z"
      />
      <g className="shimmer">
        <path
          d="M330 252 h34 M450 246 h22 M560 250 h40 M760 244 h24 M860 246 h18"
          strokeLinecap="round"
        />
      </g>
      <ellipse className="reflect" cx="600" cy="250" rx="30" ry="2.4" />
      <g className="islet">
        <ellipse cx="700" cy="246" rx="30" ry="4.5" className="islet-land" />
        <path
          className="ruin"
          d="M693 245 L693 222 L695 222 L695 219 L698 219 L698 222 L701 222 L701 219 L704 219 L704 222 L706 222 L706 245 Z"
        />
        <rect className="ruin-win" x="698" y="228" width="3" height="5" />
        <path className="ruin" d="M706 245 L706 236 L712 238 L713 245 Z" />
      </g>
      <g className="ripples">
        <circle cx="400" cy="254" r="6" />
        <circle cx="520" cy="250" r="6" />
        <circle cx="640" cy="256" r="6" />
        <circle cx="820" cy="246" r="6" />
      </g>
    </>
  );
}
