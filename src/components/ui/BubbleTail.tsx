type Props = {
  /** The bubble's edge the tail grows from: on the left it slants down, on the top or bottom it points straight out. */
  edge: "left" | "top" | "bottom";
  width: number;
  height: number;
  /** How long the stretch of the bubble's edge it joins is. */
  base: number;
  /** Where it sits: place it so its joining edge covers the bubble's 1.5px border. */
  className: string;
};

/**
 * A comic-style tail for a speech bubble with a `field` fill and a 1.5px
 * `border` (DESIGN.md sections 8, 9 and 11). Its fill covers the stretch of
 * the bubble's border it joins, and its outline runs only along its two outer
 * sides, so the bubble's border carries on around it with no seam.
 */
export function BubbleTail({ edge, width: w, height: h, base, className }: Props) {
  const outline = outlineOf(edge, w, h, base);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className={`absolute overflow-visible ${className}`}
    >
      <path d={`${outline} Z`} className="fill-field" />
      <path
        d={outline}
        className="fill-none stroke-border"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The tail's two outer sides: from one end of its base to the tip and back to the other. */
function outlineOf(edge: Props["edge"], w: number, h: number, base: number): string {
  const from = (w - base) / 2;
  const to = (w + base) / 2;
  switch (edge) {
    case "left":
      return `M${w} 0 L0.75 ${h - 0.75} L${w} ${base}`;
    case "top":
      return `M${from} ${h} L${w / 2} 0.75 L${to} ${h}`;
    case "bottom":
      return `M${from} 0 L${w / 2} ${h - 0.75} L${to} 0`;
    default: {
      const unhandled: never = edge;
      throw new Error(String(unhandled));
    }
  }
}
