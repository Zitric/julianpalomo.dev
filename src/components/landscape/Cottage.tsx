/** The white cottage. Its windows take the moment's window colour; its chimney smokes in autumn and winter. */
export function Cottage() {
  return (
    <g className="cottage" transform="translate(-250 -2)">
      <path
        className="smoke"
        d="M612 196 c -4 -6 4 -10 0 -16 c -4 -6 4 -10 0 -16"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect className="chimney" x="609" y="196" width="5" height="9" />
      <path className="roof" d="M584 210 L592 199 L616 199 L624 210 Z" />
      <rect className="walls" x="586" y="209" width="36" height="13" />
      <rect className="window" x="592" y="213" width="5" height="5" />
      <rect className="window" x="610" y="213" width="5" height="5" />
      <rect className="door" x="601" y="214" width="5" height="8" />
    </g>
  );
}
