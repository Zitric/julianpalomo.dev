import { assistantCow as cow } from "../../lib/scene/palette";

/**
 * The cow's two front hooves over the chat's edge (DESIGN.md section 9), for
 * the 132 × 104 cow: 17 × 11 each, 26px in from each side and 17px up from its
 * bottom, in its darkest brown. They sit over the drawing rather than in it,
 * so the drawing stays the approved reference.
 */
export function CowHooves() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 132 104"
      width={132}
      height={104}
      className="pointer-events-none absolute inset-0"
    >
      <rect x={26} y={76} width={17} height={11} rx={5.5} fill={cow.strand} />
      <rect x={89} y={76} width={17} height={11} rx={5.5} fill={cow.strand} />
    </svg>
  );
}
